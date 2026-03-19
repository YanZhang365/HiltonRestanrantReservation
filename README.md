# RestanrantReservation
Hilton Restaurant Reservation System概述 
这是一个基于现代Web技术栈构建的希尔顿餐厅预订管理系统，采用前后端分离架构，提供客人在线预订和员工后台管理功能。 

# 技术栈选择
## 后端
    Node.js + Express: 选择Node.js是因为其非阻塞I/O模型非常适合处理大量并发的预订请求，Express提供了轻量级的Web框架基础
    GraphQL (Apollo Server): 采用GraphQL替代传统REST API，提供更灵活的数据查询能力，客户端可以精确获取所需数据，减少网络传输
    Couchbase: 选用Couchbase作为NoSQL数据库，其分布式架构和高性能读写特性非常适合预订系统的实时性要求，同时支持灵活的文档结构
    JWT + bcryptjs: JWT用于无状态身份认证，bcryptjs提供安全的密码哈希存储，确保用户信息安全

    客人登录方式：手机号+验证码，验证码目前暂时发到后台输出
    员工登录方式：员工号+密码
## 前端
    原生JavaScript + SPA架构: 采用原生JS实现单页应用，避免框架依赖，提高加载速度和兼容性
    Axios: 用于HTTP请求处理，提供拦截器功能统一处理认证和错误


# 架构设计:
    SPA单页应用: 通过前端路由实现无刷新页面切换
    模块化组织: 按功能模块分离代码，便于团队协作和后期维护
    前后端分离: 通过API接口通信，前后端可独立开发和部署
    

# 部署和运行
```
Node.js >= 18.x  
npm >= 8.x 
Couchbase Server >= 7.0 
现代浏览器（Chrome/Firefox/Safari最新版本）
```

# 安装依赖
```
cd backend
npm install

cd frontend
npm install --save-dev live-server
```

# 环境配置
本地启动可以直接使用backend/.env
数据库：
    创建Bucket: hilton_reservation 
    创建Scope: reservation_system 
    创建Collections: guests, employees, reservations, tables, verification_codes
## 数据导入：
    预先load 两个表的数据：employees 和 tables，文件在根目录下：employee_data.json 和 table_data.json ，导入时Import With Document ID 选 _doc_key
# 启动服务
```
cd backend
npm run dev 
或
docker run -d -p 4000:4000 \
  -e PORT=4000 \
  -e JWT_SECRET=hilton_restaurant_2026_secret \
  -e JWT_EXPIRES_IN=4h \
  -e COUCHBASE_HOST=host.docker.internal \
  -e COUCHBASE_USER=Administrator \
  -e COUCHBASE_PWD=soczIb-rirre9-bornam \
  -e COUCHBASE_BUCKET=restaurant \
  -e COUCHBASE_SCOPE=core \
  -e LOG_LEVEL=info \
  --name reservation-app \
  reservation:1.0

通过docker logs reservation-app 获取客人登录验证码

cd frontend
live-server

```
# 登录方式：
客人直接用手机号+验证码登录，
员工 登录的工号：YG2026001  密码：password
