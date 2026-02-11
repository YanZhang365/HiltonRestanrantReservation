import { v4 as uuidv4 } from 'uuid';
import * as reservationDao from '../dao/reservationDao.js';
import * as tableDao from '../dao/tableDao.js';
import * as guestDao from '../dao/guestDao.js'
import {
  RESERVATION_STATUS,
  USER_ROLE
} from '../config/constants.js';
import * as validators from '../utils/validators.js';
import { AppError } from '../utils/response.js';

export const createReservation= async (resvInput, guest_id) => {
  const { guest_number, expected_arrival_date, expected_arrival_time } = resvInput;
  validators.validateFutureTime(expected_arrival_date, expected_arrival_time);
  const guestInfo = await guestDao.getGuestById(guest_id);
  const allowedTableIds = await tableDao.getTableTypeByCapacity(guest_number); 
  const occupiedTableIds = await reservationDao.checkOccupiedTableByTime(allowedTableIds,expected_arrival_date, expected_arrival_time);
  const availableTableIds = allowedTableIds.filter(id => !occupiedTableIds.has(id));
  if (availableTableIds.length === 0) {
    throw new AppError("该时段已满座，请更换时段/人数", 400);
  }
  const resvId = `resv_${uuidv4()}`;
  const now = new Date().toISOString();
  const resvData = {
    resv_id: resvId,
    guest_id: guest_id,
    guest_basic_info: {
      name: guestInfo.name,
      email: guestInfo.contact.email,
      phone: guestInfo.contact.phone
    },
    guest_number: guest_number,
    table_ids: [availableTableIds[0]], // 分配第一个可用桌位，后续可优化为支持多桌组合
    expected_arrival_date: expected_arrival_date,
    expected_arrival_time: expected_arrival_time,
    status: RESERVATION_STATUS.REQUESTED,
    created_at: now,
    updated_at: now,
    updated_by: guest_id
  };
  return await reservationDao.createReservation(resvData);
};

export const getReservationById = async (resvId) => {
  return await reservationDao.getReservationById(resvId);
}; 
export const getReservationsByGuestId = async (guest_id) => {
  return await reservationDao.getReservationsByGuestId(guest_id);
};

export const getReservations = async (phone, date, time, status) => {
  if (status) reservationDao.validateReservationStatus(status);
  const allTables = await tableDao.getAllTables();
  const result = await reservationDao.getReservations(phone, date, time, status);
  result.forEach(element => {
    element.table_nos = element.table_ids.map(id => {
      const table = allTables.find(t => t.table_id === id);
      return table ? table.table_no : '未知桌位';
    });
  });
  return result;
};

export const updateReservationStatus = async (resvId, newValue, operator) => {
  await reservationDao.validateReservationStatus(newValue);
  const resv = await reservationDao.getReservationById(resvId);

  if (operator.type === USER_ROLE.GUEST) {
    if (newValue !== RESERVATION_STATUS.CANCELLED) {
      throw new AppError('客人仅可取消预约', 403);
    }
    if (resv.status === RESERVATION_STATUS.COMPLETED) {
      throw new AppError('已完成的预约无法取消', 400);
    }
  } else if (operator.type === USER_ROLE.EMPLOYEE) {
    const allowedStatus = [
      RESERVATION_STATUS.APPROVED,
      RESERVATION_STATUS.CANCELLED,
      RESERVATION_STATUS.COMPLETED
    ];
    if (!allowedStatus.includes(newValue)) {
      throw new AppError(`员工仅可设置状态为：${allowedStatus.join('/')}`, 403);
    }
  }

  return await reservationDao.updateReservation(resvId, { status: newValue, updated_by: operator.id|| operator.guest_id });
};

export const updateReservationInfo = async (resvId, newValue, operator) => {
  const { guest_number, expected_arrival_date, expected_arrival_time } = newValue;
  validators.validateFutureTime(expected_arrival_date, expected_arrival_time);
  const resv = await reservationDao.getReservationById(resvId);
  if (resv.status === RESERVATION_STATUS.COMPLETED) {
    throw new AppError('已完成的预约无法修改', 400);
  }
  const allowedTableIds = await tableDao.getTableTypeByCapacity(guest_number); 
  const occupiedTableIds = await reservationDao.checkOccupiedTableByTime(allowedTableIds,expected_arrival_date, expected_arrival_time);
  const availableTableIds = allowedTableIds.filter(id => !occupiedTableIds.has(id));
  if (availableTableIds.length === 0) {
    throw new AppError("该时段已满座，请更换时段/人数", 400);
  }
  guest_number ? resv.guest_number = guest_number : '';
  expected_arrival_date ? resv.expected_arrival_date = expected_arrival_date : '';
  expected_arrival_time ? resv.expected_arrival_time = expected_arrival_time : '';
  resv.table_ids = [availableTableIds[0]]; // 分配第一个可用桌位，后续可优化为支持多桌组合
  return await reservationDao.updateReservation(resvId, { ...resv, updated_by: operator.id|| operator.guest_id });
};
 

export const getReservationDetail = async (resvId) => {
  const allTables = await tableDao.getAllTables();
  const result = await reservationDao.getReservationById(resvId);
  result.table_nos = result.table_ids.map(id => {
    const table = allTables.find(t => t.table_id === id);
    return table ? table.table_no : '未知桌位';
  });
  return result;
};