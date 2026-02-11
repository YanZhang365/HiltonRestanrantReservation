import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/response.js';
import logger from '../utils/logger.js';

const verificationCollection = scope?.collection('verification_codes');

export const saveCode = async (phone, code, expireSeconds = 300) => {
  try {
    const now = new Date();
    const expireAt = new Date(now.getTime() + expireSeconds * 1000).toISOString(); 
    const createdAt = now.toISOString(); 
    const codeDoc = {
      phone,
      code,
      expire_at: expireAt,
      created_at: createdAt
    };

    await verificationCollection.upsert(phone, codeDoc);
    logger.info(`验证码保存成功，手机号：${phone}, ${code}`);
  } catch (error) {
    logger.error(`保存验证码失败，手机号：${phone}，错误信息：${error.message}`, error.stack);
    throw new AppError('验证码发送失败，请稍后重试', 500);
  }
};

export const verifyCode = async (phone, inputCode) => {
  try {
    const result = await verificationCollection.get(phone);
    const codeDoc = result.content; 

    const isCodeMatch = codeDoc.code === inputCode;
    const isNotExpired = new Date() < new Date(codeDoc.expire_at);
    const isNotUsed = codeDoc.used === undefined || codeDoc.used === false;

    if (isCodeMatch && isNotExpired && isNotUsed) {
      codeDoc.used = true;
      await verificationCollection.upsert(phone, codeDoc);
      logger.info(`验证码校验成功，手机号：${phone}`);
      return true;
    }

    logger.warn(`验证码校验失败，手机号：${phone}，原因：${!isCodeMatch ? '验证码不匹配' : (isNotExpired ? '验证码已过期' : '验证码已使用,请重新获取')}`);
    return false;
  } catch (error) {
    if (error.code === 13) {
      logger.warn(`验证码校验失败，手机号：${phone}，原因：未获取验证码或验证码已失效`);
      return false;
    }
    logger.error(`验证码校验失败，手机号：${phone}，错误信息：${error.message}`, error.stack);
    throw new AppError('验证验证码失败，请稍后重试', 500);
  }
};

export const cleanExpiredCodes = async () => {
  try {
    const n1ql = `
      DELETE FROM verification_codes
      WHERE expire_at < $1
    `;
    const queryResult = await scope.query(n1ql, {
      parameters: [new Date(new Date().getTime() - 1 * 60 * 60 * 1000).toISOString()]
    });
    const deletedCount = queryResult.metaData?.metrics?.deletedCount || 0;
    logger.info(`清理过期1小时验证码完成，共删除${deletedCount}条记录`);
    return deletedCount;
  } catch (error) {
    logger.error(`清理过期验证码失败，错误信息：${error.message}`, error.stack);
    throw new AppError('清理过期验证码失败', 500);
  }
};