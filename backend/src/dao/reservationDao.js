import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import { RESERVATION_STATUS } from '../model/constants.js';


const reservationCollection = scope.collection('reservations');

export const createReservation = async (resvData) => {
  try {
    await reservationCollection.upsert(resvData.resv_id, resvData);
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

export const getReservationsByguest_id = async (guest_id) => {
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

export const filterReservations = async (date, status) => {
  try {
    let query = `
      SELECT * FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.reservations
      WHERE DATE_TRUNC('day', expected_arrival_time) = $1
    `;
    const params = [date];
    // 可选状态筛选
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY expected_arrival_time ASC';

    const result = await scope.query(query, { parameters: params });
    return result.rows.map(item => item.reservations);
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

export const checkTableTimeConflict = async (tableIds, arrivalTime, excludeResvId = null) => {
  try {
    const startTime = new Date(new Date(arrivalTime).getTime() - 60 * 60 * 1000).toISOString();
    const endTime = new Date(new Date(arrivalTime).getTime() + 60 * 60 * 1000).toISOString();

    const tableIdsStr = tableIds.map(id => `'${id}'`).join(',');
    let query = `
      SELECT COUNT(*) as count FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.reservations
      WHERE table_ids ANY t IN table_ids SATISFIES t IN [${tableIdsStr}] END
        AND expected_arrival_time BETWEEN $1 AND $2
        AND status IN ('${RESERVATION_STATUS.REQUESTED}', '${RESERVATION_STATUS.APPROVED}')
    `;
    const params = [startTime, endTime];

    if (excludeResvId) {
      query += ' AND resv_id != $3';
      params.push(excludeResvId);
    }

    const result = await scope.query(query, { parameters: params });
    const conflictCount = parseInt(result.rows[0].count);
    if (conflictCount > 0) {
      throw new AppError('所选桌台在该时间段已被预约，请更换时间或桌台', 400);
    }
    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('桌台冲突校验失败', error.message);
    throw new AppError('校验桌台预约状态失败', 500);
  }
};