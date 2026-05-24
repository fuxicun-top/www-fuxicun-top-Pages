// ========================================
// 文件说明：数据库帮助函数
// 文件路径：functions/api/utils/db.js
// 功能：数据库查询、单行查询、执行写入、批量执行
// 适用于：Cloudflare D1 数据库（SQLite 兼容）
// ========================================

/**
 * 查询多行数据
 * @param {Object} db - D1 数据库绑定对象
 * @param {string} sql - SQL 查询语句
 * @param {Array} params - 参数化查询参数（防 SQL 注入）
 * @returns {Promise<Object>} 查询结果对象，包含 results 数组
 */
export async function dbQuery(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.all();
}

/**
 * 查询单行数据
 * @param {Object} db - D1 数据库绑定对象
 * @param {string} sql - SQL 查询语句
 * @param {Array} params - 参数化查询参数
 * @returns {Promise<Object|null>} 单行结果对象，无数据时返回 null
 */
export async function dbQueryFirst(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.first();
}

/**
 * 执行写入操作（INSERT/UPDATE/DELETE）
 * @param {Object} db - D1 数据库绑定对象
 * @param {string} sql - SQL 执行语句
 * @param {Array} params - 参数化查询参数
 * @returns {Promise<Object>} 执行结果，包含 meta.last_row_id 等信息
 */
export async function dbRun(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.run();
}

/**
 * 批量执行多条 SQL 语句（事务模式）
 * 所有语句在一个事务中执行，任一失败则全部回滚
 * @param {Object} db - D1 数据库绑定对象
 * @param {Array<Object>} statements - SQL 语句数组，每项包含 sql 和 params 字段
 * @returns {Promise<Array>} 所有语句的执行结果数组
 */
export async function dbBatch(db, statements) {
  return await db.batch(statements.map(s => {
    if (s.params && s.params.length > 0) {
      return db.prepare(s.sql).bind(...s.params);
    }
    return db.prepare(s.sql);
  }));
}
