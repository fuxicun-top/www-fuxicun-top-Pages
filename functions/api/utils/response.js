// ========================================
// 文件说明：统一响应格式工具
// 文件路径：functions/api/utils/response.js
// 功能：成功响应、错误响应、列表响应（含分页信息）
// 所有 API 返回格式统一为 { success, data, message, meta }
// ========================================

/**
 * 成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 成功提示信息
 * @returns {Response} JSON 格式的 Response 对象
 */
export function successResponse(data, message = '操作成功') {
  return new Response(JSON.stringify({
    success: true,
    data: data,
    message: message
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 错误响应
 * @param {string} message - 错误提示信息
 * @param {number} status - HTTP 状态码（默认 400）
 * @returns {Response} JSON 格式的 Response 对象
 */
export function errorResponse(message = '操作失败', status = 400) {
  return new Response(JSON.stringify({
    success: false,
    data: null,
    message: message
  }), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 列表响应（含分页信息）
 * @param {Array} list - 数据列表
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 * @returns {Response} JSON 格式的 Response 对象，包含分页元数据
 */
export function listResponse(list, total, page, pageSize) {
  return new Response(JSON.stringify({
    success: true,
    data: {
      list: list,
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize)
    },
    message: '查询成功'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
