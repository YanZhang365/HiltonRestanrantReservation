import bcrypt from 'bcryptjs'; // 加密
import { generateToken } from '../utils/auth.js'; 
import { AppError } from '../utils/response.js';
import logger from '../utils/logger.js';
import { getEmployeeByJobNo } from '../dao/employeeDao.js';

export const employeeLogin = async (job_no, password) => {
  const employee = await getEmployeeByJobNo(job_no);
  if (!employee || !employee.is_active) {
    throw new AppError('工号不存在或员工已离职', 401);
  }

  const isPwdMatch = await bcrypt.compare(password, employee.password);
  if (!isPwdMatch) {
    logger.warn(`员工登录密码错误，工号：${job_no}`);
    throw new AppError('密码错误，请重新输入', 401);
  }

  const token = generateToken({
    id: employee.employee_id,
    role: employee.role,
    type: 'employee'
  });

  const empInfo = {
    employee_id: employee.employee_id,
    name: employee.name,
    job_no: employee.job_no,
    role: employee.role,
    position: employee.position,
    store_id: employee.store_id
  };

  logger.info(`员工登录成功，工号：${job_no}，角色：${employee.role}`);
  return { token, employee: empInfo };
};
