import { v4 as uuidv4 } from 'uuid';
import * as guestDao from '../dao/guestDao.js';
import { saveCode, verifyCode } from '../dao/verificationCodeDao.js'; 
// import { sendSms } from '../utils/smsSender.js'; // 短信发送（对接阿里云/腾讯云）


export const sendRegisterCode = async (phone) => {
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new AppError('手机号格式错误', 400);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await saveCode(phone, code, 5 * 60);
  // await sendSms(phone, `【XX餐厅】您的注册/登录验证码：${code}, 5分钟内有效`);
  return { code: code, message: '验证码发送成功, 5分钟内有效' };
};


export const loginOrRegisterByCode = async (phone, code, name, email) => {
  const isCodeValid = await verifyCode(phone, code);
  if (!isCodeValid) throw new AppError('验证码错误或已过期', 400);
  const existingGuest = await getGuestByPhoneNum(phone);
  if (existingGuest) {
    return existingGuest;
  }

  const guest_id = `guest_${uuidv4()}`;
  const now = new Date().toISOString();
  const newGuest = {
    guest_id: guest_id,
    name: name || '未知用户', 
    contact: { phone, email }, 
    created_at: now,
    updated_at: now
  };
  await createGuest(newGuest);
  return newGuest;
};
export const createGuest = async (guestData) => {
  return await guestDao.createGuest(guestData);
}
export const getGuestById = async (guest_id) => {
  return await guestDao.getGuestById(guest_id);
};
export const getGuestByPhoneNum = async (phoneNum) => {
  return await guestDao.getGuestByPhoneNum(phoneNum);
};
