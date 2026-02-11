
const GQL_FRAGMENTS = {
  // 客人预约相关
  CREATE_RESERVATION: `
    mutation createReservation($input: CreateReservationInput!) {
      createReservation(input: $input) {
        resv_id
        guest_id
        guest_basic_info{
          name
        }
        table_ids
        guest_number
        expected_arrival_date
        expected_arrival_time
        status
      }
    }
  `,
  My_RESERVATIONS: `
    query myReservations {
      myReservations {
        resv_id
        guest_id
        guest_basic_info {
          name
        }
        table_ids
        guest_number
        expected_arrival_date
        expected_arrival_time
        status
        created_at
        updated_at
        updated_by
      }
    }
  `,
  GET_RESERVATIONS: `
    query getReservations($phone: String, $date: String, $time: String, $status: ReservationStatus) {
      getReservations(phone: $phone, date: $date, time: $time, status: $status) {
        resv_id
        guest_id
        guest_basic_info {
          name
          phone
        }
        table_nos
        guest_number
        expected_arrival_date
        expected_arrival_time
        status
        created_at
        updated_at
        updated_by
      }
    }
  `,
  GET_RESERVATION_DETAIL: `
    query getReservationDetail($resvId: String!) {
      getReservationDetail(resv_id: $resvId) {
        resv_id
        guest_id
        guest_basic_info {
          name
          phone
        }
        table_nos
        guest_number
        expected_arrival_date
        expected_arrival_time
        status
        created_at
        updated_at
        updated_by
      }
    }
  `,
  UPDATE_RESERVATION_STATUS: `
    mutation updateReservationStatus($resvId: String!, $status: ReservationStatus!) {
      updateReservationStatus(resv_id: $resvId, newStatus: $status) {
        resv_id
        guest_id
        guest_basic_info {
          name
          phone
        }
        table_nos
        guest_number
        expected_arrival_date
        expected_arrival_time
        status
        created_at
        updated_at
        updated_by
      }
    }
  `,
};

// ========== 封装通用GQL调用工具函数（复用） ==========
async function requestGQL(query, variables = {}) {
  if (!window.$api) {
    throw new Error('$api未初始化，请先加载common.js');
  }
  // 统一发送GQL请求
  const res = await window.$api.post('/graphql', {
    query: query,
    variables: variables
  });
  // 统一处理GQL错误
  if (res?.errors) {
    const errMsg = res.data.errors.map(e => e.message).join('；');
    throw new Error(errMsg || 'GraphQL请求失败');
  }
  return res;
}

// ========== 封装各业务的GQL调用方法 ==========
window.GqlApi = {
  // 创建预约
  createReservation: async (input) => {
    const data = await requestGQL(GQL_FRAGMENTS.CREATE_RESERVATION, { input });
    return data.createReservation;
  },
  getMyReservations: async () => {
    const data = await requestGQL(GQL_FRAGMENTS.My_RESERVATIONS);
    return data.myReservations;
  },
  getReservations: async (filters = {}) => {
    const data = await requestGQL(GQL_FRAGMENTS.GET_RESERVATIONS, filters);
    return data.getReservations;
  },
  getReservationDetail: async (resvId) => {
    const data = await requestGQL(GQL_FRAGMENTS.GET_RESERVATION_DETAIL, { resvId });
    return data.getReservationDetail;
  },
  updateReservationStatus: async (resvId, status) => {
    const data = await requestGQL(GQL_FRAGMENTS.UPDATE_RESERVATION_STATUS, { resvId, status });
    return data.updateReservationStatus;
  }
};