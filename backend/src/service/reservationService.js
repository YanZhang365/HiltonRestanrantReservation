import { v4 as uuidv4 } from 'uuid';
import {
  createReservation,
  getReservationById,
  getReservationsByguest_id,
  filterReservations,
  updateReservation,
  checkTableTimeConflict
} from '../dao/reservationDao.js';
import { getTablesByIds } from '../dao/tableDao.js';
import { getGuestById } from '../dao/guestDao.js';
import {
  RESERVATION_STATUS,
  USER_ROLE
} from '../model/constants.js';
import {
  validateReservationStatus,
  validateFutureTime,
  validatePhone
} from '../model/validators.js';
import { AppError } from '../utils/errorHandler.js';


export const createReservationService = async (resvInput, guest_id) => {
  const { table_ids, expected_arrival_time, guest_basic_info } = resvInput;
  validateFutureTime(expected_arrival_time);
  if (guest_basic_info?.phone) validatePhone(guest_basic_info.phone);
  const tables = await getTablesByIds(table_ids);
  await checkTableTimeConflict(table_ids, expected_arrival_time);
  const table_total_capacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const resvId = `resv_${uuidv4()}`;
  const now = new Date().toISOString();
  const resvData = {
    resv_id: resvId,
    guest_id: guest_id,
    guest_basic_info: guest_basic_info,
    table_ids: table_ids,
    table_total_capacity: table_total_capacity,
    expected_arrival_time: new Date(expected_arrival_time).toISOString(),
    status: RESERVATION_STATUS.REQUESTED,
    created_at: now,
    updated_at: now,
    updated_by: USER_ROLE.GUEST
  };
  return await createReservation(resvData);
};

export const getGuestReservationsService = async (guest_id) => {
  await getGuestById(guest_id);
  return await getReservationsByguest_id(guest_id);
};

export const filterReservationsService = async (date, status) => {
  if (status) validateReservationStatus(status);
  return await filterReservations(date, status);
};

export const updateReservationStatusService = async (resvId, newStatus, operatorRole) => {
  validateReservationStatus(newStatus);
  const resv = await getReservationById(resvId);

  if (operatorRole === USER_ROLE.GUEST) {
    if (newStatus !== RESERVATION_STATUS.CANCELLED) {
      throw new AppError('客人仅可取消预约', 403);
    }
    if (resv.status === RESERVATION_STATUS.COMPLETED) {
      throw new AppError('已完成的预约无法取消', 400);
    }
  } else if (operatorRole === USER_ROLE.EMPLOYEE) {
    const allowedStatus = [
      RESERVATION_STATUS.APPROVED,
      RESERVATION_STATUS.CANCELLED,
      RESERVATION_STATUS.COMPLETED
    ];
    if (!allowedStatus.includes(newStatus)) {
      throw new AppError(`员工仅可设置状态为：${allowedStatus.join('/')}`, 403);
    }
  }

  return await updateReservation(resvId, {
    status: newStatus,
    updated_by: operatorRole
  });
};

export const updateReservationInfoService = async (resvId, updateInput, guest_id) => {
  const { table_ids, expected_arrival_time } = updateInput;
  const resv = await getReservationById(resvId);

  if (resv.guest_id !== guest_id) {
    throw new AppError('你无权更新他人的预约', 403);
  }
  if (
    resv.status === RESERVATION_STATUS.COMPLETED ||
    resv.status === RESERVATION_STATUS.CANCELLED
  ) {
    throw new AppError('已完成/已取消的预约无法更新信息', 400);
  }

  const updateData = {};
  if (table_ids) {
    await getTablesByIds(table_ids);
    await checkTableTimeConflict(table_ids, expected_arrival_time || resv.expected_arrival_time, resvId);
    const tables = await getTablesByIds(table_ids);
    updateData.table_ids = table_ids;
    updateData.table_total_capacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  }
  if (expected_arrival_time) {
    validateFutureTime(expected_arrival_time);
    await checkTableTimeConflict(table_ids || resv.table_ids, expected_arrival_time, resvId);
    updateData.expected_arrival_time = new Date(expected_arrival_time).toISOString();
  }

  return await updateReservation(resvId, {
    ...updateData,
    updated_by: USER_ROLE.GUEST
  });
};

export const getReservationDetailService = async (resvId) => {
  return await getReservationById(resvId);
};