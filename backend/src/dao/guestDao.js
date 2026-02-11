import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/response.js';
import logger from '../utils/logger.js';

const guestCollection = scope?.collection('guests');

export const createGuest = async (guestData) => {
  try {
    await guestCollection.upsert(guestData.guest_id, guestData);
    logger.info(`客人创建成功：${guestData.guest_id}`);
    return guestData;
  } catch (error) {
    logger.error('创建客人失败', error);
    throw new AppError('创建客人信息失败', 500);
  }
};

export const getGuestById = async (guest_id) => {
  try {
    const result = await guestCollection.get(guest_id);
    return result.content;
  } catch (error) {
    if (error.code === 13) { 
      throw new AppError('客人信息不存在', 404);
    }
    logger.error('查询客人失败', error);
    throw new AppError('查询客人信息失败', 500);
  }
};


export const getGuestByPhoneNum = async (phone) => {
  try {
    const n1ql = `
      SELECT * 
      FROM guests
      WHERE contact.phone = $1
      LIMIT 1;
    `;
    const queryResult = await scope.query(n1ql, { parameters: [phone] });
    if (queryResult.rows.length === 0) {
      logger.info('客人信息不存在,自动创建账号', 404);
      return null; 
    }
    return queryResult.rows[0].guests; 
  } catch (error) {
    if (error instanceof AppError) {
      throw error; 
    }
    logger.error('按手机号查询客人失败', error);
    throw new AppError('查询客人信息失败', 500);
  }
};

export const updateGuest = async (guest_id, updateData) => {
  try {
    const guest = await getGuestById(guest_id);
    const newGuest = { ...guest, ...updateData, updated_at: new Date().toISOString() };
    await guestCollection.upsert(guest_id, newGuest);
    logger.info(`客人更新成功：${guest_id}`);
    return newGuest;
  } catch (error) {
    throw error;
  }
};