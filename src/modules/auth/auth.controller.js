const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');

const login = catchAsync(async (req, res) => {
  const { usu_crro, usu_clve } = req.body;
  try {
    const result = await authService.login(usu_crro, usu_clve);
    res.status(200).json({ message: 'Login exitoso', data: result });
  } catch (error) {
    // Si es un error de credenciales, lo lanzamos con un status 401
    throw Object.assign(new Error(error.message), { status: 401 });
  }
});

const registerRepre = catchAsync(async (req, res) => {
  const result = await authService.registerRepresentante(req.body);
  res.status(201).json({ success: true, data: result });
});

const registerEsp = catchAsync(async (req, res) => {
  const result = await authService.registerEspecialista(req.body);
  res.status(201).json({ success: true, data: result });
});

const getMe = catchAsync(async (req, res) => {
  const result = await authService.getMe(req.user.usu_codi);
  res.json({ success: true, data: result });
});

const updateMe = catchAsync(async (req, res) => {
  const result = await authService.updateMe(req.user.usu_codi, req.body);
  res.json({ success: true, message: 'Perfil actualizado exitosamente', data: result });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.status(200).json({ success: true, message: 'Si el correo existe, se enviará un enlace de recuperación.' });
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
});

const getInvitationDetails = catchAsync(async (req, res) => {
  const { token } = req.query;
  const result = await authService.getInvitationDetails(token);
  res.status(200).json({ success: true, data: result });
});

const completeInvitation = catchAsync(async (req, res) => {
  const result = await authService.completeInvitation(req.body);
  res.status(200).json({ success: true, message: 'Invitación completada con éxito', data: result });
});

module.exports = { 
  login, 
  registerRepre, 
  registerEsp, 
  getMe, 
  updateMe,
  forgotPassword, 
  resetPassword, 
  getInvitationDetails, 
  completeInvitation 
};
