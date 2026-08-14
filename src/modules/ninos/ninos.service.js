const prisma = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const env = require('../../config/env');
const { generateId } = require('../../utils/idGenerator');
const AppError = require('../../utils/AppError');

class NinosService {
  async crearNinoParaRepresentante(usu_codi, data) {
    // Verificar que el usuario sea representante
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi }
    });

    if (!repre) {
      throw new Error('Usuario no está registrado como representante');
    }

    // Obtener la institución del representante (a través de su primer niño)
    const primerNino = await prisma.tm_ninos.findFirst({
      where: { tm_repre_ninos: { some: { rep_cod: repre.rep_cod } } }
    });
    let instCodi = data.ins_codi || primerNino?.ins_codi;
    if (!instCodi) {
      const inst = await prisma.tm_insti.findFirst();
      instCodi = inst ? inst.ins_codi : 'I001';
    }

    const nuevoNino = await prisma.tm_ninos.create({
      data: {
        nin_codi: data.nin_codi,
        ins_codi: instCodi,
        nin_nomb: data.nin_nomb,
        nin_apel: data.nin_apel,
        nin_fnac: new Date(data.nin_fnac),
        nin_gner: data.nin_gner,
        nin_nivd: data.nin_nivd,
        nin_ingr: new Date()
      }
    });

    // Vincular al representante actual mediante la tabla pivote N:M
    await prisma.tm_repre_ninos.create({
      data: {
        rep_cod: repre.rep_cod,
        nin_codi: nuevoNino.nin_codi
      }
    });

    return nuevoNino;
  }

  async getMisNinos(usu_codi, rol_codi) {
    if (rol_codi === 'ROL_REP') {
      const repre = await prisma.tm_repre.findUnique({
        where: { usu_codi },
        include: { tm_repre_ninos: { include: { tm_ninos: true } } }
      });
      return repre?.tm_repre_ninos.map(rn => rn.tm_ninos) || [];
    }
    
    if (rol_codi === 'ROL_ESP') {
      const espec = await prisma.tm_espec.findUnique({
        where: { usu_codi },
        include: { tc_asign: { include: { tm_ninos: true } } }
      });
      return espec?.tc_asign.map(a => a.tm_ninos) || [];
    }

    if (rol_codi === 'ROL_DIR') {
      return await prisma.tm_ninos.findMany();
    }
    
    if (rol_codi === 'ROL_ADM') {
      // Como tm_admin puede no estar definido, lo omitimos si no existe
      // o buscamos si el usuario tiene una institución asignada
      return await prisma.tm_ninos.findMany();
    }

    throw new Error('Rol no soportado para esta consulta');
  }

  async setUmbral(nin_codi, data) {
    const umbral = await prisma.tc_umbra.create({
      data: {
        umb_codi: data.umb_codi,
        nin_codi: nin_codi,
        sen_codi: data.sen_codi,
        umb_limi: data.umb_limi,
        umb_lims: data.umb_lims,
        umb_ajus: new Date()
      }
    });
    return umbral;
  }

  async buscarRepresentantePorCedula(cedula) {
    if (!cedula) return null;

    const repre = await prisma.tm_repre.findFirst({
      where: {
        rep_cedu: cedula,
        tm_usuar: { is: { usu_estd: true } }
      },
      include: {
        tm_usuar: true,
        _count: { select: { tm_repre_ninos: true } }
      }
    });
    if (!repre) return null;

    return {
      encontrado: true,
      rep_nomb: repre.rep_nomb,
      rep_apel: repre.rep_apel,
      rep_rela: repre.rep_rela,
      rep_telf: repre.rep_telf,
      rep_cedu: repre.rep_cedu,
      usu_crro: repre.tm_usuar.usu_crro,
      ninos: repre._count.tm_repre_ninos
    };
  }

  async inviteRepresentative(especCodi, data) {
    let generatedPassword = '';
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar o crear el usuario del representante
      let user = await tx.tm_usuar.findFirst({ where: { usu_crro: data.usu_crro } });
      let repre = null;
      let reutilizado = false;

      if (user && user.usu_estd) {
        // Usuario activo: reutilizarlo si ya es representante
        repre = await tx.tm_repre.findUnique({ where: { usu_codi: user.usu_codi } });
        if (!repre) {
          throw new AppError('El correo electrónico ya está registrado y activo', 409);
        }
        reutilizado = true;
      } else if (user) {
        // Usuario inactivo: reactivar la invitación anterior
        generatedPassword = 'Padre' + crypto.randomBytes(3).toString('hex');
        const hashedClve = await bcrypt.hash(generatedPassword, 10);

        const existingRep = await tx.tm_repre.findUnique({
          where: { usu_codi: user.usu_codi }
        });
        if (existingRep) {
          // Eliminar asignaciones asociadas a los niños del representante
          const ninosVinculados = await tx.tm_repre_ninos.findMany({
            where: { rep_cod: existingRep.rep_cod }
          });
          for (const vinculo of ninosVinculados) {
            await tx.tc_asign.deleteMany({
              where: { nin_codi: vinculo.nin_codi }
            });
          }
          await tx.tm_repre_ninos.deleteMany({
            where: { rep_cod: existingRep.rep_cod }
          });
          await tx.tm_repre.delete({
            where: { rep_cod: existingRep.rep_cod }
          });
          for (const vinculo of ninosVinculados) {
            await tx.tm_ninos.delete({
              where: { nin_codi: vinculo.nin_codi }
            });
          }
        }

        user = await tx.tm_usuar.update({
          where: { usu_codi: user.usu_codi },
          data: {
            usu_clve: hashedClve,
            usu_estd: true
          }
        });
      } else {
        // Usuario nuevo
        generatedPassword = 'Padre' + crypto.randomBytes(3).toString('hex');
        const hashedClve = await bcrypt.hash(generatedPassword, 10);
        user = await tx.tm_usuar.create({
          data: {
            usu_codi: generateId('U'),
            rol_codi: 'ROL_REP',
            usu_crro: data.usu_crro,
            usu_clve: hashedClve,
            usu_crea: new Date(),
            usu_estd: true
          }
        });
      }

      // 2. Determine ins_codi. It should belong to the specialist's clinic, or default to I001.
      let instCodi = 'I001';
      const espec = await tx.tm_espec.findUnique({ where: { usu_codi: especCodi } });
      if (espec && espec.ins_codi) {
        instCodi = espec.ins_codi;
      } else {
        const admin = await tx.tm_admin.findUnique({ where: { usu_codi: especCodi } });
        if (admin && admin.ins_codi) {
          instCodi = admin.ins_codi;
        }
      }

      // 3. Create tm_ninos
      const nino = await tx.tm_ninos.create({
        data: {
          nin_codi: generateId('N'),
          ins_codi: instCodi,
          nin_nomb: data.nin_nomb,
          nin_apel: data.nin_apel,
          nin_fnac: new Date(data.nin_fnac),
          nin_gner: data.nin_gner,
          nin_nivd: data.nin_nivd,
          nin_ingr: new Date()
        }
      });

      // 4. Reutilizar o crear tm_repre
      if (!repre) {
        repre = await tx.tm_repre.create({
          data: {
            rep_cod: generateId('R'),
            usu_codi: user.usu_codi,
            rep_cedu: data.rep_cedu,
            rep_nomb: data.rep_nomb,
            rep_apel: data.rep_apel,
            rep_rela: data.rep_rela,
            rep_telf: data.rep_telf
          }
        });
      }

      // 4b. Vincular el representante al niño (relación N:M)
      await tx.tm_repre_ninos.create({
        data: {
          rep_cod: repre.rep_cod,
          nin_codi: nino.nin_codi
        }
      });

      // 5. Create assignments (tc_asign) if created by a specialist to link them immediately
      if (espec) {
        await tx.tc_asign.create({
          data: {
            asi_codi: generateId('AS'),
            nin_codi: nino.nin_codi,
            esp_codi: espec.esp_codi,
            asi_inic: new Date(),
            asi_stdo: 'Activo'
          }
        });
      }

      // 6. Create tc_sensi if data provided
      if (data.sen_tipo && data.sen_nvli) {
        const sen_codi = generateId('SN');
        await tx.tc_sensi.create({
          data: {
            sen_codi: sen_codi,
            nin_codi: nino.nin_codi,
            sen_tipo: data.sen_tipo,
            sen_nvli: data.sen_nvli,
            sen_nota: 'Registrado en admisión'
          }
        });
        
        // Relacionar la sensibilidad principal con el niño
        await tx.tm_ninos.update({
          where: { nin_codi: nino.nin_codi },
          data: { sen_codi: sen_codi }
        });
      }

      return { user, nino, repre, reutilizado };
    });

    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/login`;

    // Enviar correo de invitación únicamente si se creó cuenta nueva
    let emailSent = false;
    if (!result.reutilizado) {
      const emailService = require('../../services/email.service');
      try {
        await emailService.sendEmail({
          to: result.user.usu_crro,
          subject: 'Invitación y Credenciales de Acceso - SIAT',
          templateName: 'invite-representative',
          context: {
            nombre_padre: `${result.repre.rep_nomb} ${result.repre.rep_apel}`,
            nombre_nino: `${result.nino.nin_nomb} ${result.nino.nin_apel}`,
            email: result.user.usu_crro,
            password: generatedPassword,
            loginUrl: loginUrl
          }
        });
        emailSent = true;
      } catch (error) {
        console.warn('⚠️ Error al enviar correo de invitación (EmailJS):', error.message);
      }

      console.log(`🔗 Credenciales generadas para ${result.user.usu_crro} - Password: ${generatedPassword}`);
    }

    return {
      nin_codi: result.nino.nin_codi,
      nin_nomb: result.nino.nin_nomb,
      nin_apel: result.nino.nin_apel,
      reutilizado: result.reutilizado,
      representante: result.reutilizado
        ? {
            rep_nomb: result.repre.rep_nomb,
            rep_apel: result.repre.rep_apel,
            rep_rela: result.repre.rep_rela
          }
        : null,
      passwordGenerada: result.reutilizado ? null : generatedPassword,
      emailSent: emailSent
    };
  }

  async getMiExpediente(usu_codi) {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: {
        tm_repre_ninos: {
          include: {
            tm_ninos: {
              include: {
                tc_asign: {
                  where: { asi_stdo: 'Activo' },
                  include: {
                    tm_espec: {
                      include: {
                        tm_especi: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!repre) {
      throw new Error('Representante no encontrado');
    }

    const nino = repre.tm_repre_ninos[0]?.tm_ninos;
    if (!nino) {
      return null;
    }

    // Calcular edad
    const hoy = new Date();
    const cumple = new Date(nino.nin_fnac);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }

    // Especialista
    const especialista = nino.tc_asign[0]?.tm_espec
      ? `Dr(a). ${nino.tc_asign[0].tm_espec.esp_nomb} ${nino.tc_asign[0].tm_espec.esp_apel}`
      : 'Dra. Elena Ramos (Fundación)';

    return {
      nin_codi: nino.nin_codi,
      nin_nomb: nino.nin_nomb,
      nin_apel: nino.nin_apel,
      nin_fnac: nino.nin_fnac,
      nin_edad: `${edad} años`,
      nin_gner: nino.nin_gner,
      nin_nivd: nino.nin_nivd,
      especialista,
      perfil_sensorial: 'Sensorial Mixto (Ajustado)'
    };
  }

  async getBitacoras(usu_codi, nin_codi) {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: { tm_repre_ninos: true }
    });

    if (!repre) {
      throw new Error('Representante no encontrado');
    }

    const targetNin = nin_codi || repre.tm_repre_ninos[0]?.nin_codi;
    if (!targetNin) {
      return [];
    }

    return await prisma.tr_bitac.findMany({
      where: { nin_codi: targetNin },
      orderBy: { bit_fech: 'desc' }
    });
  }

  async getBitacorasByNino(nin_codi) {
    return await prisma.tr_bitac.findMany({
      where: { nin_codi },
      orderBy: { bit_fech: 'desc' }
    });
  }

  async crearBitacora(usu_codi, data) {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: { tm_repre_ninos: true }
    });

    if (!repre) {
      throw new Error('Representante no encontrado');
    }

    const targetNin = data.nin_codi || repre.tm_repre_ninos[0]?.nin_codi;
    if (!targetNin) {
      throw new Error('Representante sin niños vinculados');
    }

    // Funciones helper seguras para validación
    const parseNumber = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const parsed = Number(val);
      return isNaN(parsed) ? null : parsed;
    };

    const parseBoolean = (val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return null;
    };

    let dateVal = new Date(data.date);
    if (isNaN(dateVal.getTime())) dateVal = new Date();

    // Generar ID único
    const bit_codi = generateId('B');

    return await prisma.tr_bitac.create({
      data: {
        bit_codi: bit_codi.substring(0, 10),
        nin_codi: targetNin,
        bit_fech: dateVal,
        bit_suen: parseNumber(data.sleepHours) || 0,
        bit_cali: data.sleepQuality || 'Normal',
        bit_anim: data.mood || 'Normal',
        bit_apet: data.appetite || 'Normal',
        bit_bpm: parseNumber(data.bpm),
        bit_obse: data.text || null,
        bit_crisi: parseNumber(data.crisisCount),
        bit_dese: data.triggers || null,
        bit_senso: data.sensoryIssues || null,
        bit_medi: parseBoolean(data.medicationTaken),
        bit_diges: data.digestion || null,
        bit_crea: new Date()
      }
    });
  }

  async getFichaClinica(nin_codi) {

    const nino = await prisma.tm_ninos.findUnique({
      where: { nin_codi },
      include: {
        tc_sensi_rel: true,
        tc_umbra: {
          orderBy: { umb_ajus: 'desc' },
          take: 1
        }
      }
    });

    if (!nino) {
      throw new Error('Niño no encontrado');
    }

    return {
      nin_codi: nino.nin_codi,
      nin_nomb: nino.nin_nomb,
      nin_apel: nino.nin_apel,
      nin_fnac: nino.nin_fnac,
      nin_gner: nino.nin_gner,
      nin_nivd: nino.nin_nivd,
      nin_ingr: nino.nin_ingr,
      sensibilidad: nino.tc_sensi_rel ? {
        sen_codi: nino.tc_sensi_rel.sen_codi,
        sen_tipo: nino.tc_sensi_rel.sen_tipo,
        sen_nvli: nino.tc_sensi_rel.sen_nvli,
        sen_nota: nino.tc_sensi_rel.sen_nota
      } : null,
      umbral: nino.tc_umbra[0] ? {
        umb_codi: nino.tc_umbra[0].umb_codi,
        umb_limi: nino.tc_umbra[0].umb_limi,
        umb_lims: nino.tc_umbra[0].umb_lims,
        umb_ajus: nino.tc_umbra[0].umb_ajus
      } : null
    };
  }

  async updateFichaClinica(nin_codi, data) {
    const nino = await prisma.tm_ninos.findUnique({
      where: { nin_codi }
    });

    if (!nino) {
      throw new Error('Niño no encontrado');
    }

    // 1. Actualizar datos básicos del niño
    await prisma.tm_ninos.update({
      where: { nin_codi },
      data: {
        nin_nomb: data.nin_nomb,
        nin_apel: data.nin_apel,
        nin_fnac: new Date(data.nin_fnac),
        nin_gner: data.nin_gner,
        nin_nivd: data.nin_nivd
      }
    });

    // 2. Si se proporciona información de sensibilidad, crearla o actualizarla
    if (data.sen_tipo) {
      let senCodi = nino.sen_codi;
      if (!senCodi) {
        senCodi = generateId('S');
        senCodi = senCodi.substring(0, 10);
        
        // Crear tc_sensi
        await prisma.tc_sensi.create({
          data: {
            sen_codi: senCodi,
            nin_codi: nin_codi,
            sen_tipo: data.sen_tipo,
            sen_nvli: data.sen_nvli || 'Moderado',
            sen_nota: data.sen_nota || ''
          }
        });

        // Vincular al niño
        await prisma.tm_ninos.update({
          where: { nin_codi },
          data: { sen_codi: senCodi }
        });
      } else {
        // Actualizar tc_sensi existente
        await prisma.tc_sensi.update({
          where: { sen_codi: senCodi },
          data: {
            sen_tipo: data.sen_tipo,
            sen_nvli: data.sen_nvli || 'Moderado',
            sen_nota: data.sen_nota || ''
          }
        });
      }
    }

    return this.getFichaClinica(nin_codi);
  }
}

module.exports = new NinosService();

