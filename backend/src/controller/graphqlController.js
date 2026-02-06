import { gql } from 'apollo-server-express';
import {
  createReservationService,
  getGuestReservationsService,
  filterReservationsService,
  updateReservationStatusService,
  updateReservationInfoService,
  getReservationDetailService
} from '../service/reservationService.js';
import * as guestService from '../service/guestService.js';
import { jwtFilter } from '../utils/auth.js';

// 1. 定义GraphQL Schema（匹配业务需求）
export const typeDefs = gql`
  # 客人联系信息
  type GuestContact {
    phone: String!
    email: String
  }
  # 客人基础信息
  type GuestBasicInfo {
    name: String!
    phone: String!
    email: String
  }
  # 预约状态枚举
  enum ReservationStatus {
    Requested
    Approved
    Cancelled
    Completed
  }
  # 预约类型
  type Reservation {
    resv_id: String!
    guest_id: String!
    guest_basic_info: GuestBasicInfo!
    table_ids: [String!]!
    table_total_capacity: Int!
    expected_arrival_time: String!
    status: ReservationStatus!
    created_at: String!
    updated_at: String!
    updated_by: String!
  }
  # 输入类型：创建客人
  input CreateGuestInput {
    name: String!
    contact: GuestContactInput!
  }
  input GuestContactInput {
    phone: String!
    email: String
  }
  # 输入类型：创建预约
  input CreateReservationInput {
    table_ids: [String!]!
    expected_arrival_time: String!
    guest_basic_info: GuestBasicInfoInput!
  }
  input GuestBasicInfoInput {
    name: String!
    phone: String!
    email: String
  }
  # 输入类型：更新预约信息
  input UpdateReservationInfoInput {
    table_ids: [String!]
    expected_arrival_time: String
  }
  # 根查询
  type Query {
    # 客人：查询我的所有预约
    myReservations: [Reservation!]!
    # 员工：按日期+状态筛选预约
    filterReservations(date: String!, status: ReservationStatus): [Reservation!]!
    # 查看预约详情
    getReservationDetail(resv_id: String!): Reservation!
  }
  # 根变更
  type Mutation {
    # 创建客人（首次预约）
    createGuest(input: CreateGuestInput!): GuestBasicInfo!
    # 创建预约
    createReservation(input: CreateReservationInput!): Reservation!
    # 更新预约状态（客人取消/员工审核）
    updateReservationStatus(resv_id: String!, newStatus: ReservationStatus!): Reservation!
    # 客人更新预约信息（时间/桌台）
    updateReservationInfo(resv_id: String!, input: UpdateReservationInfoInput!): Reservation!
  }
`;

// 2. 定义GraphQL Resolver（调用Service层，解耦）
export const resolvers = {
  Query: {
    myReservations: async (_, __, context) => {
      // 从context获取用户信息（jwtFilter中间件挂载）
      const guest_id = context.user.guest_id;
      return await getGuestReservationsService(guest_id);
    },
    filterReservations: async (_, { date, status }) => {
      return await filterReservationsService(date, status);
    },
    getReservationDetail: async (_, { resv_id }) => {
      return await getReservationDetailService(resv_id);
    }
  },
  Mutation: {
    createGuest: async (_, { input }) => {
      const guest = await guestService.createGuestService(input);
      return {
        name: guest.name,
        phone: guest.contact.phone,
        email: guest.contact.email
      };
    },
    createReservation: async (_, { input }, context) => {
      const guest_id = context.user.id;
      return await createReservationService(input, guest_id);
    },
    updateReservationStatus: async (_, { resv_id, newStatus }, context) => {
      const operatorRole = context.user.role;
      return await updateReservationStatusService(resv_id, newStatus, operatorRole);
    },
    updateReservationInfo: async (_, { resv_id, input }, context) => {
      const guest_id = context.user.id;
      return await updateReservationInfoService(resv_id, input, guest_id);
    }
  }
};

// 3. GraphQL上下文（传递用户信息）
export const context = ({ req }) => {
  // 验证Token，挂载用户信息到context
  if (req.headers.authorization) {
    jwtFilter(req, {}, () => {});
  }
  return { user: req.user };
};