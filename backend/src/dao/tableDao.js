import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/errorHandler.js';

const tableCollection = scope.collection('tables');

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