import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/response.js';
import logger from '../utils/logger.js';
import { RESERVATION_STATUS } from '../config/constants.js';


const reservationCollection = scope?.collection('reservations');

export const createReservation = async (resvData) => {
  try {
    const result = await reservationCollection.upsert(resvData.resv_id, resvData);
    logger.info(`预约创建成功：${resvData.resv_id}`);
    return resvData; 
  } catch (error) {
    logger.error('创建预约失败', error.message);
    throw new AppError('创建预约失败', 500);
  }
};

export const getReservationById = async (resvId) => {
  try {
    const result = await reservationCollection.get(resvId);
    return result.content;
  } catch (error) {
    if (error.code === 13) {
      throw new AppError('预约信息不存在', 404);
    }
    logger.error('查询预约失败', error.message);
    throw new AppError('查询预约信息失败', 500);
  }
};

export const getReservationsByGuestId = async (guest_id) => {
  try {
    const query = `
      SELECT * FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.reservations
      WHERE guest_id = $1
      ORDER BY created_at DESC
    `;
    const result = await scope.query(query, { parameters: [guest_id] });
    return result.rows.map(item => item.reservations);
  } catch (error) {
    logger.error('查询客人预约失败', error.message);
    throw new AppError('查询你的预约记录失败', 500);
  }
};
export const validateReservationStatus = async (status) => {
  if (!Object.values(RESERVATION_STATUS).includes(status)) {
    throw new AppError(`无效的预约状态：${status}`, 400);
  }
};
export const getReservations = async (phone, date, time, status) => {
  try {
    let query = `
      SELECT * FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.reservations
    `;
    const conditions = [];
    const params = [];

    if (date) {
      conditions.push(`expected_arrival_date = $${params.length + 1}`);
      params.push(date); 
    }
    if (time) {
      conditions.push(`expected_arrival_time = $${params.length + 1}`);
      params.push(time);
    }
    if (phone) {
      conditions.push(`guest_phone = $${params.length + 1}`);
      params.push(phone);
    }
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY expected_arrival_time DESC';
    const result = await scope.query(query, { parameters: params });
    const reservations = result.rows.map(item => item.reservations || {});
    return reservations;
  } catch (error) {
    logger.error('筛选预约失败', error.message);
    throw new AppError('筛选预约记录失败', 500);
  }
};

export const updateReservation = async (resvId, updateData) => {
  try {
    const resv = await getReservationById(resvId);
    const newResv = { ...resv, ...updateData, updated_at: new Date().toISOString() };
    await reservationCollection.upsert(resvId, newResv);
    logger.info(`预约更新成功：${resvId}，状态：${newResv.status}`);
    return newResv;
  } catch (error) {
    throw error;
  }
};

export const checkOccupiedTableByTime = async (tableIds, arrivalDate, arrivalTime) => {
  try {
    const arrayContainsConditions = tableIds.map((_, idx) => {
      const placeholder = `$${5 + idx}`;
    return `ARRAY_CONTAINS(table_ids, ${placeholder})`;
  }).join(' OR ');
    const query = `
      SELECT table_ids 
      FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.reservations 
      WHERE table_ids IS NOT NULL AND expected_arrival_date = $1 AND expected_arrival_time = $2
      AND (status=$3 OR status=$4) AND (${arrayContainsConditions})
      `;

      const params = [
        arrivalDate,
        arrivalTime, 
        RESERVATION_STATUS.REQUESTED, 
        RESERVATION_STATUS.APPROVED,
        ...tableIds
      ];

    const result = await scope.query(query, { parameters: params });
    const occupiedTableIds = new Set();
    result.rows.forEach(row => {
      row.reservations.table_ids.forEach(id => occupiedTableIds.add(id));
    });
    return occupiedTableIds;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('桌台冲突校验失败', error.message);
    throw new AppError('校验桌台预约状态失败', 500);
  }
};