import { jest } from '@jest/globals';

// 在模块级别设置mock，使用工厂函数
const mockGetGuestById = jest.fn();
const mockGetTableTypeByCapacity = jest.fn();
const mockCheckOccupiedTableByTime = jest.fn();
const mockCreateReservation = jest.fn();
const mockGetReservationById = jest.fn();
const mockUpdateReservation = jest.fn();
const mockGetReservationsByGuestId = jest.fn();
const mockGetReservations = jest.fn();
const mockValidateReservationStatus = jest.fn();
const mockGetAllTables = jest.fn();

// Mock DAO模块
jest.unstable_mockModule('./dao/guestDao.js', () => ({
  __esModule: true,
  getGuestById: mockGetGuestById
}));

jest.unstable_mockModule('./dao/tableDao.js', () => ({
  __esModule: true,
  getTableTypeByCapacity: mockGetTableTypeByCapacity,
  getAllTables: mockGetAllTables
}));

jest.unstable_mockModule('./dao/reservationDao.js', () => ({
  __esModule: true,
  checkOccupiedTableByTime: mockCheckOccupiedTableByTime,
  createReservation: mockCreateReservation,
  getReservationById: mockGetReservationById,
  updateReservation: mockUpdateReservation,
  getReservationsByGuestId: mockGetReservationsByGuestId,
  getReservations: mockGetReservations,
  validateReservationStatus: mockValidateReservationStatus
}));

// Mock其他依赖
jest.unstable_mockModule('./config/constants.js', () => ({
  __esModule: true,
  RESERVATION_STATUS: {
    REQUESTED: 'Requested',
    APPROVED: 'Approved',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed'
  },
  USER_ROLE: {
    GUEST: 'Guest',
    EMPLOYEE: 'Employee'
  }
}));

jest.unstable_mockModule('./utils/response.js', () => ({
  __esModule: true,
  AppError: class AppError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  }
}));

jest.unstable_mockModule('./utils/validators.js', () => ({
  __esModule: true,
  validateFutureTime: jest.fn()
}));

jest.unstable_mockModule('uuid', () => ({
  __esModule: true,
  v4: () => 'mock-uuid-123'
}));

// 导入服务模块
const reservationService = await import('./service/reservationService.js');

describe('reservationService', () => {
  let validatorsModule;

  beforeEach(async () => {
    // 清空所有mock调用记录
    mockGetGuestById.mockClear();
    mockGetTableTypeByCapacity.mockClear();
    mockCheckOccupiedTableByTime.mockClear();
    mockCreateReservation.mockClear();
    mockGetReservationById.mockClear();
    mockUpdateReservation.mockClear();
    mockGetReservationsByGuestId.mockClear();
    mockGetReservations.mockClear();
    mockValidateReservationStatus.mockClear();
    mockGetAllTables.mockClear();
    
    // 重新导入 validators 模块
    validatorsModule = await import('./utils/validators.js');
    validatorsModule.validateFutureTime.mockClear();
    
    // 默认让 validateFutureTime 成功通过，除非特定测试需要它抛出异常
    validatorsModule.validateFutureTime.mockImplementation(() => {});
  });

  describe('createReservation', () => {
    const mockResvInput = {
      guest_number: 4,
      expected_arrival_date: '2024-12-01',
      expected_arrival_time: '18:00'
    };
    const mockGuestId = 'guest_123';

    test('创建预约成功：分配可用桌位', async () => {
      // 设置mock返回值
      mockGetGuestById.mockResolvedValue({
        name: '张三',
        contact: { email: 'zhangsan@test.com', phone: '13800138000' }
      });

      mockGetTableTypeByCapacity.mockResolvedValue(['table_001', 'table_002']);

      mockCheckOccupiedTableByTime.mockResolvedValue(new Set(['table_002']));

      mockCreateReservation.mockResolvedValue({
        resv_id: 'resv_mock-uuid-123',
        ...mockResvInput,
        guest_id: mockGuestId,
        table_ids: ['table_001'],
        status: 'Requested'
      });

      // 执行方法
      const result = await reservationService.createReservation(mockResvInput, mockGuestId);

      // 断言
      expect(mockGetGuestById).toHaveBeenCalledWith(mockGuestId);
      expect(mockGetTableTypeByCapacity).toHaveBeenCalledWith(4);
      expect(mockCheckOccupiedTableByTime).toHaveBeenCalledWith(
        ['table_001', 'table_002'],
        '2024-12-01',
        '18:00'
      );
      expect(mockCreateReservation).toHaveBeenCalled();
      expect(result.resv_id).toBe('resv_mock-uuid-123');
      expect(result.table_ids).toEqual(['table_001']);
    });

    test('创建预约失败：该时段无可用桌位', async () => {
      // 设置mock返回值
      mockGetGuestById.mockResolvedValue({ name: '张三', contact: {} });
      mockGetTableTypeByCapacity.mockResolvedValue(['table_001']);
      mockCheckOccupiedTableByTime.mockResolvedValue(new Set(['table_001']));

      // 断言错误
      await expect(
        reservationService.createReservation(mockResvInput, mockGuestId)
      ).rejects.toThrow('该时段已满座，请更换时段/人数');
    });

    test('创建预约失败：时间不是未来时间', async () => {
      validatorsModule.validateFutureTime.mockImplementation(() => {
        throw new Error('时间必须是未来时间');
      });

      await expect(
        reservationService.createReservation(mockResvInput, mockGuestId)
      ).rejects.toThrow('时间必须是未来时间');
    });
  });

  describe('getReservationById', () => {
    test('获取预约详情成功', async () => {
      const mockResvId = 'resv_123';
      const mockReservation = { resv_id: mockResvId, guest_number: 2 };

      mockGetReservationById.mockResolvedValue(mockReservation);

      const result = await reservationService.getReservationById(mockResvId);

      expect(mockGetReservationById).toHaveBeenCalledWith(mockResvId);
      expect(result).toEqual(mockReservation);
    });
  });

  describe('getReservationsByGuestId', () => {
    test('根据客人ID获取预约列表成功', async () => {
      const mockGuestId = 'guest_123';
      const mockReservations = [{ resv_id: 'resv_1', guest_id: mockGuestId }];

      mockGetReservationsByGuestId.mockResolvedValue(mockReservations);

      const result = await reservationService.getReservationsByGuestId(mockGuestId);

      expect(mockGetReservationsByGuestId).toHaveBeenCalledWith(mockGuestId);
      expect(result).toEqual(mockReservations);
    });
  });

  describe('getReservations', () => {
    test('获取预约列表成功', async () => {
      const mockReservations = [
        { resv_id: 'resv_1', table_ids: ['table_001'], guest_number: 2 },
        { resv_id: 'resv_2', table_ids: ['table_002'], guest_number: 4 }
      ];
      const mockTables = [
        { table_id: 'table_001', table_no: 'A1' },
        { table_id: 'table_002', table_no: 'B2' }
      ];

      mockGetAllTables.mockResolvedValue(mockTables);
      mockGetReservations.mockResolvedValue(mockReservations);

      const result = await reservationService.getReservations(null, null, null, null);

      expect(mockGetAllTables).toHaveBeenCalled();
      expect(mockGetReservations).toHaveBeenCalledWith(null, null, null, null);
      expect(result[0].table_nos).toEqual(['A1']);
      expect(result[1].table_nos).toEqual(['B2']);
    });

    test('获取预约列表时验证状态', async () => {
      const mockReservations = [
        { resv_id: 'resv_1', table_ids: ['table_001'], guest_number: 2 }
      ];
      const mockTables = [
        { table_id: 'table_001', table_no: 'A1' }
      ];

      mockValidateReservationStatus.mockReturnValue(true);
      mockGetAllTables.mockResolvedValue(mockTables);
      mockGetReservations.mockResolvedValue(mockReservations);

      const result = await reservationService.getReservations(null, null, null, 'Approved');

      expect(mockValidateReservationStatus).toHaveBeenCalledWith('Approved');
      expect(mockGetAllTables).toHaveBeenCalled();
      expect(mockGetReservations).toHaveBeenCalledWith(null, null, null, 'Approved');
    });
  });

  describe('updateReservationStatus', () => {
    const mockResvId = 'resv_123';
    
    test('客人仅可取消预约', async () => {
      const mockReservation = { resv_id: mockResvId, status: 'Requested' };
      const guestOperator = { type: 'Guest', guest_id: 'guest_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);
      
      await expect(
        reservationService.updateReservationStatus(mockResvId, 'Approved', guestOperator)
      ).rejects.toThrow('客人仅可取消预约');
    });

    test('客人取消预约成功', async () => {
      const mockReservation = { resv_id: mockResvId, status: 'Requested' };
      const guestOperator = { type: 'Guest', guest_id: 'guest_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);
      mockUpdateReservation.mockResolvedValue({ ...mockReservation, status: 'Cancelled' });

      const result = await reservationService.updateReservationStatus(mockResvId, 'Cancelled', guestOperator);

      expect(mockGetReservationById).toHaveBeenCalledWith(mockResvId);
      expect(mockUpdateReservation).toHaveBeenCalledWith(mockResvId, { 
        status: 'Cancelled', 
        updated_by: 'guest_123' 
      });
      expect(result.status).toBe('Cancelled');
    });

    test('客人不能取消已完成的预约', async () => {
      const mockReservation = { resv_id: mockResvId, status: 'Completed' };
      const guestOperator = { type: 'Guest', guest_id: 'guest_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);

      await expect(
        reservationService.updateReservationStatus(mockResvId, 'Cancelled', guestOperator)
      ).rejects.toThrow('已完成的预约无法取消');
    });

    test('员工设置有效状态', async () => {
      const mockReservation = { resv_id: mockResvId, status: 'Requested' };
      const employeeOperator = { type: 'Employee', id: 'emp_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);
      mockUpdateReservation.mockResolvedValue({ ...mockReservation, status: 'Approved' });

      const result = await reservationService.updateReservationStatus(mockResvId, 'Approved', employeeOperator);

      expect(mockGetReservationById).toHaveBeenCalledWith(mockResvId);
      expect(mockUpdateReservation).toHaveBeenCalledWith(mockResvId, { 
        status: 'Approved', 
        updated_by: 'emp_123' 
      });
      expect(result.status).toBe('Approved');
    });

    test('员工设置无效状态', async () => {
      const mockReservation = { resv_id: mockResvId, status: 'Requested' };
      const employeeOperator = { type: 'Employee', id: 'emp_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);

      await expect(
        reservationService.updateReservationStatus(mockResvId, 'InvalidStatus', employeeOperator)
      ).rejects.toThrow('员工仅可设置状态为：Approved/Cancelled/Completed');
    });
  });

  describe('updateReservationInfo', () => {
    const mockResvId = 'resv_123';
    
    test('修改预约信息成功', async () => {
      const mockReservation = { 
        resv_id: mockResvId, 
        status: 'Requested',
        guest_number: 2,
        expected_arrival_date: '2024-12-01',
        expected_arrival_time: '18:00',
        table_ids: ['table_001']
      };
      const newValue = {
        guest_number: 4,
        expected_arrival_date: '2024-12-02',
        expected_arrival_time: '19:00'
      };
      const operator = { id: 'emp_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);
      mockGetTableTypeByCapacity.mockResolvedValue(['table_001', 'table_002']);
      mockCheckOccupiedTableByTime.mockResolvedValue(new Set(['table_002']));
      mockUpdateReservation.mockResolvedValue({ ...mockReservation, ...newValue, table_ids: ['table_001'] });

      const result = await reservationService.updateReservationInfo(mockResvId, newValue, operator);

      expect(mockGetReservationById).toHaveBeenCalledWith(mockResvId);
      expect(validatorsModule.validateFutureTime).toHaveBeenCalledWith('2024-12-02', '19:00');
      expect(mockGetTableTypeByCapacity).toHaveBeenCalledWith(4);
      expect(mockCheckOccupiedTableByTime).toHaveBeenCalledWith(
        ['table_001', 'table_002'],
        '2024-12-02',
        '19:00'
      );
      expect(mockUpdateReservation).toHaveBeenCalledWith(mockResvId, {
        ...mockReservation,
        guest_number: 4,
        expected_arrival_date: '2024-12-02',
        expected_arrival_time: '19:00',
        table_ids: ['table_001'],
        updated_by: 'emp_123'
      });
    });

    test('不能修改已完成的预约', async () => {
      const mockReservation = { 
        resv_id: mockResvId, 
        status: 'Completed',
        guest_number: 2
      };
      const newValue = { guest_number: 4 };
      const operator = { id: 'emp_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);

      await expect(
        reservationService.updateReservationInfo(mockResvId, newValue, operator)
      ).rejects.toThrow('已完成的预约无法修改');
    });

    test('修改预约失败：该时段无可用桌位', async () => {
      const mockReservation = { 
        resv_id: mockResvId, 
        status: 'Requested',
        guest_number: 2
      };
      const newValue = {
        guest_number: 4,
        expected_arrival_date: '2024-12-02',
        expected_arrival_time: '19:00'
      };
      const operator = { id: 'emp_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);
      mockGetTableTypeByCapacity.mockResolvedValue(['table_001']);
      mockCheckOccupiedTableByTime.mockResolvedValue(new Set(['table_001']));

      await expect(
        reservationService.updateReservationInfo(mockResvId, newValue, operator)
      ).rejects.toThrow('该时段已满座，请更换时段/人数');
    });
    
    test('修改预约失败：时间不是未来时间', async () => {
      const mockReservation = { 
        resv_id: mockResvId, 
        status: 'Requested',
        guest_number: 2
      };
      const newValue = {
        guest_number: 4,
        expected_arrival_date: '2024-12-02',
        expected_arrival_time: '19:00'
      };
      const operator = { id: 'emp_123' };

      mockGetReservationById.mockResolvedValue(mockReservation);
      validatorsModule.validateFutureTime.mockImplementation(() => {
        throw new Error('时间必须是未来时间');
      });

      await expect(
        reservationService.updateReservationInfo(mockResvId, newValue, operator)
      ).rejects.toThrow('时间必须是未来时间');
    });
  });

  describe('getReservationDetail', () => {
    test('获取预约详情成功', async () => {
      const mockReservation = { 
        resv_id: 'resv_123', 
        table_ids: ['table_001', 'table_002'],
        guest_number: 4
      };
      const mockTables = [
        { table_id: 'table_001', table_no: 'A1' },
        { table_id: 'table_002', table_no: 'B2' }
      ];

      mockGetReservationById.mockResolvedValue(mockReservation);
      mockGetAllTables.mockResolvedValue(mockTables);

      const result = await reservationService.getReservationDetail('resv_123');

      expect(mockGetReservationById).toHaveBeenCalledWith('resv_123');
      expect(mockGetAllTables).toHaveBeenCalled();
      expect(result.table_nos).toEqual(['A1', 'B2']);
    });

    test('获取预约详情时遇到未知桌位', async () => {
      const mockReservation = { 
        resv_id: 'resv_123', 
        table_ids: ['table_001', 'table_unknown'],
        guest_number: 4
      };
      const mockTables = [
        { table_id: 'table_001', table_no: 'A1' }
      ];

      mockGetReservationById.mockResolvedValue(mockReservation);
      mockGetAllTables.mockResolvedValue(mockTables);

      const result = await reservationService.getReservationDetail('resv_123');

      expect(mockGetReservationById).toHaveBeenCalledWith('resv_123');
      expect(mockGetAllTables).toHaveBeenCalled();
      expect(result.table_nos).toEqual(['A1', '未知桌位']);
    });
  });
});
