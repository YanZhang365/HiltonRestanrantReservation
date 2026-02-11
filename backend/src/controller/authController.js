import express from 'express';
import { generateToken } from '../utils/auth.js';
import * as guestService from '../service/guestService.js';
import * as employeeService from '../service/employeeService.js';
import logger from '../utils/logger.js';
import { AppError,sendSuccess } from '../utils/response.js';

const router = express.Router();

router.post('/guest/send-code', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new AppError('请输入手机号', 400);
    const result = await guestService.sendRegisterCode(phone);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post('/guest/login', async (req, res, next) => {
  try {
    const { phone, code, name , email} = req.body;
    if (!phone || !code) throw new AppError('手机号和验证码不能为空', 400);
    const guest = await guestService.loginOrRegisterByCode(phone, code, name, email);
    const token = generateToken({ guest_id: guest.guest_id, phone: guest.contact.phone });
    sendSuccess(res, { token, user: { ...guest, type: 'guest' } }, '登录/注册成功');
  } catch (error) {
    next(error);
  }
});

router.post('/employee/login', async (req, res, next) => {
  try {
    const { job_no, password} = req.body;
    if (!job_no || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入员工ID和密码'
      });
    }
    const result = await employeeService.employeeLogin(job_no, password);
    logger.info(`员工登录成功：${result.employee.employee_id}，角色：${result.employee.role}`);
    sendSuccess(res, { token: result.token, user: { ...result.employee, type: 'employee' } }, '登录成功');
  } catch (error) {
    next(error);
  }
});

export default router;