import { scope } from '../config/couchbase.js';
import { AppError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';


const employeeCollection = scope.collection('employees');

export const getEmployeeByJobNo = async (job_no) => {
  try {
    const n1ql = `
      SELECT * FROM employees
      WHERE job_no = $1
      LIMIT 1
    `;
    const queryResult = await scope.query(n1ql, { parameters: [job_no] });
    return queryResult.rows.length > 0 ? queryResult.rows[0].employees : null;
  } catch (error) {
    logger.error(`按工号查询员工失败，工号：${job_no}，错误：${error.message}`, error.stack);
    throw new AppError('查询员工信息失败', 500);
  }
};