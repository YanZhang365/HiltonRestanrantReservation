const GuestReserveState = {
  reserveSubmitting: false, 
  reserveQuerying: false  
};

function getGuestPhone() {
  const user = window.getUserInfo?.(); 
  return user?.contact?.phone || user?.phone || '';
}

// ====================== 表单校验 ======================
function checkReserveForm() {
  const date = document.getElementById('reserve-date')?.value.trim() || '';
  const people = document.getElementById('reserve-people')?.value.trim() || '';
  const time = document.getElementById('reserve-time')?.value.trim() || '';
  const dateTip = document.getElementById('date-tip');
  const peopleTip = document.getElementById('people-tip');
  const timeTip = document.getElementById('time-tip');

  if (!dateTip || !peopleTip || !timeTip) return false; 

  let isOk = true;
  const today = new Date().toISOString().split('T')[0]; 

  if (!date || date < today) {
    dateTip.classList.add('show');
    isOk = false;
  } else {
    dateTip.classList.remove('show');
  }

  const guest_number = Number(people);
  if (!people || isNaN(guest_number) || guest_number < 1 || guest_number > 10) {
    peopleTip.classList.add('show');
    isOk = false;
  } else {
    peopleTip.classList.remove('show');
  }

  if (!time) {
    timeTip.classList.add('show');
    isOk = false;
  } else {
    timeTip.classList.remove('show');
  }

  return isOk;
}

// ====================== 提交预约 ======================
async function submitReserve() {
  if (GuestReserveState.reserveSubmitting) return;
  if (!checkReserveForm()) return;

  const phone = getGuestPhone();
  if (!phone) {
    alert('未获取到您的手机号，请重新登录');
    return;
  }

  const date = document.getElementById('reserve-date').value.trim();
  const people = document.getElementById('reserve-people').value.trim();
  const time = document.getElementById('reserve-time').value.trim();
  const submitBtn = document.getElementById('submit-reserve');

  // 状态标记
  GuestReserveState.reserveSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.innerText = '提交中...';

  try {
    const addReserve = await window.GqlApi.createReservation({
      expected_arrival_date: date,
      guest_number: Number(people),
      expected_arrival_time: time
    }) || [];

    alert('预约提交成功！请等待员工审批');
    document.getElementById('reserve-date').value = '';
    document.getElementById('reserve-people').value = '';
    document.getElementById('reserve-time').value = '';
    queryMyReserves();
  } catch (err) {
    alert('预约提交失败：' + (err.message || '网络异常'));
    console.error('提交预约错误：', err);
  } finally {
    GuestReserveState.reserveSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.innerText = '提交预约';
  }
}

// ====================== 查询我的预约 ======================
async function queryMyReserves() {
  console.log('===== 进入 queryMyReserves 函数 =====');

  console.log('axiosInstance 详情：', window.axiosInstance);
  if (GuestReserveState.reserveQuerying) return;

  const phone = getGuestPhone();
  if (!phone) {
    alert('未获取到您的手机号，请重新登录');
    return;
  }

  const reserveList = document.getElementById('reserve-list');
  if (!reserveList) return;

  GuestReserveState.reserveQuerying = true;
  reserveList.innerHTML = '<div class="empty-tip">正在查询...</div>';

  try {
    const reserves = await window.GqlApi.getMyReservations() || [];

    if (reserves.length === 0) {
      reserveList.innerHTML = '<div class="empty-tip">暂无预约记录，请先添加预约</div>';
      return;
    }
    const formatIsoTime = (isoString) => {
      if (!isoString) return { date: '未知', time: '未知' };
      const dateObj = new Date(isoString);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
      return { date: formattedDate, time: formattedTime };
    };

    let listHtml = '';
    reserves.forEach((item, index) => {
      const createTimeObj = formatIsoTime(item.created_at);
      const formattedCreateTime = createTimeObj.date !== '未知' ? `${createTimeObj.date} ${createTimeObj.time}` : '未知';

      const canCancel = ['Requested', 'Approved', 'Pending', 'approved'].includes(item.status);
      const cancelBtnHtml = canCancel ? `
    <div class="reserve-actions">
      <button class="cancel-reserve-btn" type="button" data-resv-id="${item.resv_id}">
        取消预约
      </button>
    </div>
  ` : '';
      listHtml += `
    <div class="reserve-item">
      <div><span class="label">预约日期：</span>${item.expected_arrival_date}</div>
      <div><span class="label">预约时段：</span>${item.expected_arrival_time}</div>
      <div><span class="label">就餐人数：</span>${item.guest_number+'人' || '未知'}</div>
      <div><span class="label">预约状态：</span>${item.status || '未知状态'}</div>
      <div><span class="label">提交时间：</span>${formattedCreateTime}</div>
      ${cancelBtnHtml}
    </div>
  `;
    });

    reserveList.innerHTML = listHtml;
    reserveList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('cancel-reserve-btn')) {
        const resvId = e.target.getAttribute('data-resv-id');
        if (!resvId) {
          alert('预约ID不存在，无法取消');
          return;
        }
        const confirmCancel = confirm(`确定要取消预约【${resvId}】吗？`);
        if (!confirmCancel) return;

        try {
          const result = await window.GqlApi.updateReservationStatus(resvId, 'Cancelled');
          alert('预约取消成功！');
          queryMyReserves();

        } catch (error) {
          console.error('取消预约失败：', error);
          alert(error.message || '取消预约失败，请稍后重试');
        }
      }
    });
  } catch (err) {
    alert('查询预约失败：' + (err.message || '网络异常'));
    console.error('查询预约错误：', err);
    reserveList.innerHTML = '<div class="empty-tip">查询失败，请重试</div>';
  } finally {
    GuestReserveState.reserveQuerying = false;
    queryBtn.disabled = false;
    queryBtn.innerText = '查询我的预约';
  }
}

// ====================== 初始化预约模块 ======================
function initGuestReserve() {
  const dateInput = document.getElementById('reserve-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  queryMyReserves();

  const SPA_ROOT = document.getElementById('spa-root');
  if (SPA_ROOT) {
    SPA_ROOT.addEventListener('click', (e) => {
      if (e.target.id === 'submit-reserve') submitReserve();
    });
  }
}

window.GuestReserve = {
  init: initGuestReserve,
  submitReserve: submitReserve,
  queryMyReserves: queryMyReserves
};