import { gql } from 'apollo-server-express';
import * as reservationService from '../service/reservationService.js';
import * as guestService from '../service/guestService.js';
import { jwtFilter } from '../utils/auth.js';
import logger from '../utils/logger.js';

// GraphQL Schema
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
    table_nos: [String!] # 前端展示用
    guest_number: Int
    expected_arrival_date: String!
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
  input CreateReservationInput {
    guest_number: Int!
    expected_arrival_date: String!
    expected_arrival_time: String!
  }
  input GuestBasicInfoInput {
    name: String!
    phone: String!
    email: String
  }
  # 输入类型：更新预约信息
  input UpdateReservationInfoInput {
    guest_number: Int
    expected_arrival_date: String
    expected_arrival_time: String
  }
  # 根查询
  type Query {
    # 客人：查询我的所有预约
    myReservations: [Reservation!]!
    # 员工：按日期+状态筛选预约
    getReservations(phone: String, date: String, time: String, status: ReservationStatus): [Reservation!]!
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

// GraphQL Resolver
export const resolvers = {
  Query: {
    myReservations: async (_, __, context) => {
      // 从context获取用户信息（jwtFilter中间件挂载）
      const guest_id = context.user.guest_id;
      return await reservationService.getReservationsByGuestId(guest_id);
    },
    getReservations: async (_, filters) => {
      const { phone = null, date = null, time = null, status = null} = filters || {};
      return await reservationService.getReservations(phone, date, time, status);
    },
    getReservationDetail: async (_, { resv_id }) => {
      return await reservationService.getReservationDetail(resv_id);
    }
  },
  Mutation: {
    createGuest: async (_, { input }) => {
      const guest_id = context.user.guest_id;
      const guest = await guestService.createGuestService(input, guest_id);
      return {
        name: guest.name,
        phone: guest.contact.phone,
        email: guest.contact.email
      };
    },
    createReservation: async (_, { input }, context) => {
      const guest_id = context.user.guest_id;
      return await reservationService.createReservation(input, guest_id);
    },
    updateReservationStatus: async (_, { resv_id, newStatus }, context) => {
      const operator = context.user;
      return await reservationService.updateReservationStatus(resv_id, newStatus, operator);
    },
    updateReservationInfo: async (_, { resv_id, input }, context) => {
      const operator = context.user;
      return await reservationService.updateReservationInfo(resv_id, input, operator);
    },
  }
};

// GraphQL context
export const context = ({ req }) => {
  if (req.headers.authorization) {
    jwtFilter(req, {}, () => {});
  }
  return { user: req.user };
};