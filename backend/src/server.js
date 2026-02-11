import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from 'apollo-server-express';
import { initCouchbase } from './config/couchbase.js';
import logger from './utils/logger.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
let authRouter, graphqlController, globalErrorHandler, notFoundHandler, jwtFilter;


const startServer = async () => {
  try {
    await initCouchbase();
    logger.info('Couchbase初始化完成');
    authRouter = (await import('./controller/authController.js')).default;
    graphqlController = await import('./controller/graphqlController.js');
    const errorModule = await import('./utils/response.js');
    globalErrorHandler = errorModule.globalErrorHandler;
    notFoundHandler = errorModule.notFoundHandler;
    const authModule = await import('./utils/auth.js');
    jwtFilter = authModule.jwtFilter;

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', authRouter);


    const apolloServer = new ApolloServer({
      typeDefs: graphqlController.typeDefs,
      resolvers: graphqlController.resolvers,
      context: graphqlController.context,
      playground: process.env.NODE_ENV === 'development',
      formatError: (error) => {
        const originalError = error.extensions?.originalError;
        const realErrorMessage = originalError?.message || error.message || '无错误信息';

        logger.error('=== GraphQL错误 ===', error.message || '空');
        const getCircularReplacer = () => {
          const seen = new WeakSet();
          return (key, value) => {
            if (typeof value === "object" && value !== null) {
              if (seen.has(value)) return '[循环引用]';
              seen.add(value);
            }
            return value;
          };
        };
        return {
          message: realErrorMessage, 
          statusCode: error.extensions?.exception?.statusCode || 500
        };
      }
    });
    await apolloServer.start();

    apolloServer.applyMiddleware({
      app,
      path: '/graphql',
      middleware: [jwtFilter]
    });


    app.use(notFoundHandler);
    app.use(globalErrorHandler);


    app.listen(PORT, () => {
      logger.info(`✅ 服务启动成功，端口：${PORT}`);
      logger.info(`🔑 REST认证接口：http://localhost:${PORT}/api/auth/login`);
      logger.info(`📊 GraphQL Playground：http://localhost:${PORT}/graphql`);
    });

  } catch (error) {
    logger.error('❌ 服务启动失败 - 完整错误信息：');
    console.error(error);
    process.exit(1);
  }
};

startServer();