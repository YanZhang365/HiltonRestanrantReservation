import { AppError } from './response.js';
import { RESERVATION_STATUS } from '../config/constants.js';

export const validateReservationStatus = (status) => {
  if (!Object.values(RESERVATION_STATUS).includes(status)) {
    throw new AppError(`预约状态必须为：${Object.values(RESERVATION_STATUS).join('/')}`, 400);
  }
};

export const validateFutureTime = (date, time) => {
  const arrivalDateTime = new Date(date,time);
  const now = new Date();
  if (arrivalDateTime < now) {
    throw new AppError('预约时间必须为未来时间', 400);
  }
};

export const validatePhone = (phone) => {
  const reg = /^1[3-9]\d{9}$/;
  if (!reg.test(phone)) {
    throw new AppError('请输入合法的手机号', 400);
  }
};