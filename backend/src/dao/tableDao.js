import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/response.js';

const tableCollection = scope?.collection('tables');

export const getTablesByIds = async (tableIds) => {
  try {
    const result = await tableCollection.getMulti(tableIds);
    const tables = [];
    for (const [id, res] of Object.entries(result)) {
      if (res.error) {
        if (res.error.code === 13) {
          throw new AppError(`桌台ID不存在：${id}`, 404);
        }
        throw new AppError(`查询桌台失败：${id}`, 500);
      }
      if (!res.content.is_active) {
        throw new AppError(`桌台已停用，无法预约：${res.content.table_no}`, 400);
      }
      tables.push(res.content);
    }
    return tables;
  } catch (error) {
    throw error;
  }
};
export const getAllTables = async (tableIds) => {
  try {    
    const query = `
      SELECT table_id, table_no, capacity, is_active
      FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.tables
    `;
    const result = await scope.query(query);
    return result.rows;
  }
  catch (error) {
    throw new AppError('查询桌台失败', 500);
  }
}

export const getTableTypeByCapacity = async (capacity) => {
  try {
    const query = `
      SELECT table_id
      FROM ${process.env.COUCHBASE_BUCKET}.${process.env.COUCHBASE_SCOPE}.tables
      WHERE capacity >= $1 AND is_active = true
      ORDER BY capacity DESC
    `;
    const result = await scope.query(query, { parameters: [capacity] });
    return result.rows.map(row => row.table_id);
  } catch (error) {
    throw new AppError('查询桌台失败', 500);
  }
}