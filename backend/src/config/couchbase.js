import { Cluster, PasswordAuthenticator } from 'couchbase';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();
let cluster = null;
let bucket = null;
let scope = null;

const initCouchbase = async () => {
  try {
    const requiredEnv = ['COUCHBASE_HOST', 'COUCHBASE_USER', 'COUCHBASE_PWD', 'COUCHBASE_BUCKET', 'COUCHBASE_SCOPE'];
    const missingEnv = requiredEnv.filter(key => !process.env[key]);
    if (missingEnv.length > 0) {
      throw new Error(`缺失Couchbase环境变量:${missingEnv.join(', ')}`);
    }

    cluster = await Cluster.connect(
      `couchbase://${process.env.COUCHBASE_HOST}`,
      { authenticator: new PasswordAuthenticator(process.env.COUCHBASE_USER, process.env.COUCHBASE_PWD) }
    );
    bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
    scope = bucket.scope(process.env.COUCHBASE_SCOPE);

    logger.info(`✅ Couchbase初始化成功:Bucket=${process.env.COUCHBASE_BUCKET},Scope=${process.env.COUCHBASE_SCOPE}`);
    return { cluster, bucket, scope };
  } catch (error) {
    logger.error('❌ Couchbase初始化失败:', error.message);
    process.exit(1);
  }
};

export { initCouchbase, cluster, bucket, scope };