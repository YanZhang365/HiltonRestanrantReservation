window.ReserveManage = (function() {

  let reserveList = [];

  function init() {
    loadReserveList();
    bindEvents();
  }

  // 加载预约列表
  async function loadReserveList(filters = {}) {
    try {
      const response = await window.GqlApi.getReservations(filters);
      reserveList = response || [];
      
      renderTable(reserveList);
    } catch (error) {
      console.error('加载预约列表失败：', error);
      alert('加载预约列表失败，请稍后重试');
    }
  }

  function renderTable(list) {
    const tableBody = document.getElementById('reserve-table-body');
    tableBody.innerHTML = '';

    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">暂无预约记录</td></tr>';
      return;
    }

    list.forEach(item => {
      const tr = document.createElement('tr');
      
      let operateBtns = '';
      switch (item.status) {
        case 'Requested': // 待审批
          operateBtns = `
            <button class="operate-btn approve-btn" data-resv-id="${item.resv_id}">通过</button>
            <button class="operate-btn cancel-btn" data-resv-id="${item.resv_id}">取消</button>
          `;
          break;
        case 'Approved': // 已审批
          operateBtns = `
            <button class="operate-btn complete-btn" data-resv-id="${item.resv_id}">完成</button>
            <button class="operate-btn cancel-btn" data-resv-id="${item.resv_id}">取消</button>
          `;
          break;
        case 'Completed': // 已完成
        case 'Cancelled': // 已取消
          operateBtns = '<span></span>';
          break;
      }

      tr.innerHTML = `
        <td><span class="resv-id-link" style="color: #409eff !important;cursor: pointer" data-resv-id="${item.resv_id}">Details</span></td>
        <td>${item.guest_basic_info.name || '-'}</td>
        <td>${item.guest_basic_info.phone || '-'}</td>
        <td>${item.table_nos?.join(',') || '-'}</td>
        <td>${item.expected_arrival_date || '-'}</td>
        <td>${item.expected_arrival_time || '-'}</td>
        <td>${getStatusText(item.status)}</td>
        <td>${operateBtns}</td>
      `;

      tableBody.appendChild(tr);
    });
  }


  function bindEvents() {
    document.getElementById('search-btn').addEventListener('click', function() {
      const filters = {};
      document.getElementById('reserve-date').value ? filters.date = document.getElementById('reserve-date').value : '',
      document.getElementById('reserve-time').value ? filters.time = document.getElementById('reserve-time').value : '',
      document.getElementById('reserve-status').value ? filters.status = document.getElementById('reserve-status').value : '';
      loadReserveList(filters);
    });

    document.getElementById('reserve-table-body').addEventListener('click', function(e) {
      const target = e.target;
      if (target.classList.contains('resv-id-link')) {
        const resvId = target.dataset.resvId;
        showReserveDetail(resvId);
      }
      else if (target.classList.contains('approve-btn')) {
        const resvId = target.dataset.resvId;
        handleApprove(resvId);
      }
      else if (target.classList.contains('cancel-btn')) {
        const resvId = target.dataset.resvId;
        handleCancel(resvId);
      }
      else if (target.classList.contains('complete-btn')) {
        const resvId = target.dataset.resvId;
        handleComplete(resvId);
      }
    });

    document.getElementById('close-modal').addEventListener('click', function() {
      document.getElementById('detail-modal').style.display = 'none';
    });

    window.addEventListener('click', function(e) {
      const modal = document.getElementById('detail-modal');
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    document.querySelector(`.resv-detail-link[data-resv-id="${detail.resv_id}"]`).addEventListener('click', async function() {
  const resvId = this.dataset.resvId; 
  try {
    this.textContent = '加载中...';
    this.style.pointerEvents = 'none'; 

    const fullDetail = await window.GqlApi.getFullReservationDetail(resvId);
    
    console.log('完整预约信息：', fullDetail);
    alert(`获取到预约${resvId}的完整信息，详情见控制台！`);

  } catch (error) {
    console.error('获取完整预约信息失败：', error);
    alert('获取完整预约信息失败，请稍后重试');
  } finally {
    this.textContent = 'Detail';
    this.style.pointerEvents = 'auto';
  }
});
  }

  // 查看预约详情
  async function showReserveDetail(resvId) {
    try {
      const detail = await window.GqlApi.getReservationDetail(resvId);
      const modal = document.getElementById('detail-modal');
      const content = document.getElementById('detail-content');

      content.innerHTML = `
        <div class="detail-item"><span class="detail-label">预约ID：</span>${detail.resv_id || '-'}</div>
        <div class="detail-item"><span class="detail-label">客人姓名：</span>${detail.guest_basic_info.name || '-'}</div>
        <div class="detail-item"><span class="detail-label">客人电话：</span>${detail.guest_basic_info.phone || '-'}</div>
        <div class="detail-item"><span class="detail-label">桌位ID：</span>${detail.table_nos?.join(',') || '-'}</div>
        <div class="detail-item"><span class="detail-label">就餐人数：</span>${detail.guest_number || '-'}</div>
        <div class="detail-item"><span class="detail-label">预约日期：</span>${detail.expected_arrival_date || '-'}</div>
        <div class="detail-item"><span class="detail-label">预约时间：</span>${detail.expected_arrival_time || '-'}</div>
        <div class="detail-item"><span class="detail-label">预约状态：</span>${getStatusText(detail.status)}</div>
        <div class="detail-item"><span class="detail-label">创建时间：</span>${formatTime(detail.created_at) || '-'}</div>
        <div class="detail-item"><span class="detail-label">更新时间：</span>${formatTime(detail.updated_at) || '-'}</div>
        <div class="detail-item"><span class="detail-label">更新人：</span>${detail.updated_by || '-'}</div>
      `;
      modal.style.display = 'block';
    } catch (error) {
      console.error('获取预约详情失败：', error);
      alert('获取预约详情失败，请稍后重试');
    }
  }

  // 审批通过操作
  async function handleApprove(resvId) {
    if (!confirm('确认审批通过该预约吗？')) return;
    try {
      await window.GqlApi.updateReservationStatus(resvId, 'Approved' );
      alert('审批通过成功！');
      loadReserveList();
    } catch (error) {
      console.error('审批通过失败：', error);
      alert('审批通过失败，请稍后重试');
    }
  }

  // 取消预约操作
  async function handleCancel(resvId) {
    if (!confirm('确认取消该预约吗？')) return;
    try {
      await window.GqlApi.updateReservationStatus(resvId, 'Cancelled');
      alert('取消预约成功！');
      loadReserveList();
    } catch (error) {
      console.error('取消预约失败：', error);
      alert('取消预约失败，请稍后重试');
    }
  }

  // 标记完成操作
  async function handleComplete(resvId) {
    if (!confirm('确认标记该预约为已完成吗？')) return;
    try {
      await window.GqlApi.updateReservationStatus(resvId, 'Completed' );
      alert('标记完成成功！');
      loadReserveList();
    } catch (error) {
      console.error('标记完成失败：', error);
      alert('标记完成失败，请稍后重试');
    }
  }

  // 格式化时间
  function formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return timeStr;
    }
  }

  function getStatusText(status) {
    const statusMap = {
      'Requested': '待审批',
      'Approved': '已审批',
      'Completed': '已完成',
      'Cancelled': '已取消'
    };
    return statusMap[status] || status;
  }

  return {
    init: init
  };
})();