const passkeyService = require('./passkey.service');
const catchAsync = require('../../utils/catchAsync');

const listPasskeys = catchAsync(async (req, res) => {
  const keys = await passkeyService.listPasskeys(req.user.usu_codi);
  res.status(200).json({ data: keys });
});

const startRegistration = catchAsync(async (req, res) => {
  const options = await passkeyService.startRegistration(req.user.usu_codi);
  res.status(200).json({ options });
});

const completeRegistration = catchAsync(async (req, res) => {
  const { credential, pk_nomb } = req.body;
  const result = await passkeyService.completeRegistration(req.user.usu_codi, credential, pk_nomb);
  res.status(201).json({ message: 'Acceso rápido configurado correctamente', data: result });
});

const deletePasskey = catchAsync(async (req, res) => {
  await passkeyService.deletePasskey(req.user.usu_codi, req.params.pk_id);
  res.status(200).json({ message: 'Credencial eliminada' });
});

const startLogin = catchAsync(async (req, res) => {
  const options = await passkeyService.startLogin();
  res.status(200).json({ options });
});

const completeLogin = catchAsync(async (req, res) => {
  const { credential } = req.body;
  const session = await passkeyService.completeLogin(credential);
  res.status(200).json(session);
});

module.exports = {
  listPasskeys,
  startRegistration,
  completeRegistration,
  deletePasskey,
  startLogin,
  completeLogin
};