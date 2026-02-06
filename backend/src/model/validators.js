import { AppError } from '../utils/errorHandler.js';
import { RESERVATION_STATUS } from './constants.js';

export const validateReservationStatus = (status) => {
  if (!Object.values(RESERVATION_STATUS).includes(status)) {
    throw new AppError(`预约状态必须为：${Object.values(RESERVATION_STATUS).join('/')}`, 400);
  }
};

export const validateFutureTime = (time) => {
  const arrivalTime = new Date(time);
  const now = new Date();
  if (arrivalTime < now) {
    throw new AppError('预约时间必须为未来时间', 400);
  }
};

export const validatePhone = (phone) => {
  const reg = /^1[3-9]\d{9}$/;
  if (!reg.test(phone)) {
    throw new AppError('请输入合法的手机号', 400);
  }
};