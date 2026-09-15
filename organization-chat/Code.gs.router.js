/************************************************************
 * Code.gs — JSON Router (doGet / doPost)
 *
 * วางทับหรือเพิ่มในไฟล์ Code.gs ของ Apps Script
 * (เก็บฟังก์ชันเดิม authenticateWithLine / getUsers ฯลฯ ไว้)
 *
 * สำคัญ:
 * - อย่าให้ doGet() คืน HtmlService ถ้าจะใช้เป็น API
 * - หน้า LIFF เสิร์ฟจาก Cloudflare Worker แทน
 ************************************************************/

function jsonOut_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return jsonOut_(Object.assign({ success: true }, data || {}));
}

function fail_(message, extra) {
  return jsonOut_(Object.assign({
    success: false,
    error: String(message || 'Unknown error'),
  }, extra || {}));
}

function readBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return { _raw: e.postData.contents };
  }
}

function getParam_(e, body, key, fallback) {
  if (body && body[key] !== undefined && body[key] !== null && body[key] !== '') {
    return body[key];
  }
  if (e && e.parameter && e.parameter[key] !== undefined && e.parameter[key] !== '') {
    return e.parameter[key];
  }
  return fallback;
}

/**
 * รวม action จาก GET query / POST JSON
 */
function routeApi_(e) {
  const body = readBody_(e);
  const action = String(
    getParam_(e, body, 'action', 'health')
  ).trim();

  try {
    switch (action) {

      case 'health':
      case 'ping':
      case 'test':
        return ok_({
          system: 'Organization Chat',
          version: '5.x',
          message: 'API is working',
          time: new Date().toISOString(),
        });

      case 'users':
      case 'getUsers':
        // ถ้ามี session ค่อยบังคับในอนาคต — ตอนทดสอบเปิดให้ดึงได้
        if (typeof getUsers === 'function') {
          return ok_({ users: getUsers() });
        }
        if (typeof apiGetUsers === 'function') {
          const token = getParam_(e, body, 'sessionToken', '');
          return ok_({ users: apiGetUsers(token) });
        }
        return fail_('getUsers() not found');

      case 'user':
      case 'me':
      case 'currentUser': {
        const token = getParam_(e, body, 'sessionToken', '');
        if (typeof apiGetCurrentUser === 'function') {
          return ok_({ user: apiGetCurrentUser(token) });
        }
        return fail_('apiGetCurrentUser() not found');
      }

      case 'authenticateWithLine':
      case 'lineLogin': {
        // แบบปลอดภัย: ใช้ idToken ตรวจกับ LINE
        const idToken = getParam_(e, body, 'idToken', '');
        if (idToken && typeof authenticateWithLine === 'function') {
          return jsonOut_(authenticateWithLine(idToken));
        }

        // แบบทดสอบ: รับ lineUserId ตรง ๆ (ไม่แนะนำ production)
        if (typeof createUserFromLine === 'function' || typeof getUserByLineId === 'function') {
          const lineUserId = getParam_(e, body, 'lineUserId', '');
          const displayName = getParam_(e, body, 'displayName', 'LINE User');
          const pictureUrl = getParam_(e, body, 'pictureUrl', '');

          if (!lineUserId) {
            return fail_('ต้องมี idToken หรือ lineUserId');
          }

          let user = getUserByLineId(lineUserId);
          if (!user) {
            user = createUserFromLine(lineUserId, displayName, pictureUrl);
          } else if (typeof updateUserLogin === 'function') {
            updateUserLogin(user.userId);
          }

          const session = createSession({
            userId: user.userId,
            lineUserId: lineUserId,
            displayName: user.displayName || displayName,
          });

          return ok_({
            sessionToken: session.token,
            expiresAt: session.expiresAt,
            user: typeof getUserById === 'function' ? getUserById(user.userId) : user,
          });
        }

        return fail_('LINE login handlers not found');
      }

      case 'conversations':
      case 'getConversations': {
        const token = getParam_(e, body, 'sessionToken', '');
        const userId = getParam_(e, body, 'userId', '');
        if (typeof apiGetUserConversations === 'function') {
          return ok_({ conversations: apiGetUserConversations(token || userId) });
        }
        return fail_('apiGetUserConversations() not found');
      }

      case 'conversation':
      case 'getOrCreateConversation': {
        const token = getParam_(e, body, 'sessionToken', '');
        const otherUserId = getParam_(e, body, 'otherUserId', getParam_(e, body, 'userId2', ''));
        if (typeof apiGetConversation === 'function') {
          return ok_({ conversation: apiGetConversation(token, otherUserId) });
        }
        return fail_('apiGetConversation() not found');
      }

      case 'messages':
      case 'getMessages': {
        const token = getParam_(e, body, 'sessionToken', '');
        const conversationId = getParam_(e, body, 'conversationId', '');
        if (typeof apiGetMessages === 'function') {
          return ok_({ messages: apiGetMessages(token, conversationId) });
        }
        return fail_('apiGetMessages() not found');
      }

      case 'sendMessage':
      case 'send': {
        const token = getParam_(e, body, 'sessionToken', '');
        const toUserId = getParam_(e, body, 'toUserId', getParam_(e, body, 'receiverId', ''));
        const message = getParam_(e, body, 'message', getParam_(e, body, 'text', ''));
        if (typeof apiSendMessage === 'function') {
          return jsonOut_(apiSendMessage(token, toUserId, message));
        }
        return fail_('apiSendMessage() not found');
      }

      case 'markRead': {
        const token = getParam_(e, body, 'sessionToken', '');
        const conversationId = getParam_(e, body, 'conversationId', '');
        if (typeof apiMarkRead === 'function') {
          return jsonOut_(apiMarkRead(token, conversationId));
        }
        return fail_('apiMarkRead() not found');
      }

      case 'unread':
      case 'unreadCount': {
        const token = getParam_(e, body, 'sessionToken', '');
        if (typeof apiGetUnreadCount === 'function') {
          return ok_({ unread: apiGetUnreadCount(token) });
        }
        return fail_('apiGetUnreadCount() not found');
      }

      case 'searchUsers': {
        const token = getParam_(e, body, 'sessionToken', '');
        const q = getParam_(e, body, 'q', getParam_(e, body, 'query', ''));
        if (typeof apiSearchUsers === 'function') {
          return ok_({ users: apiSearchUsers(token, q) });
        }
        return fail_('apiSearchUsers() not found');
      }

      case 'updateStatus': {
        const token = getParam_(e, body, 'sessionToken', '');
        const status = getParam_(e, body, 'status', 'online');
        if (typeof apiUpdateUserStatus === 'function') {
          return jsonOut_(apiUpdateUserStatus(token, status));
        }
        return fail_('apiUpdateUserStatus() not found');
      }

      default:
        return fail_('Unknown action: ' + action, {
          available: [
            'health', 'users', 'user', 'authenticateWithLine', 'lineLogin',
            'conversations', 'conversation', 'messages', 'sendMessage',
            'markRead', 'unread', 'searchUsers', 'updateStatus',
          ],
        });
    }
  } catch (err) {
    return fail_(err.message || String(err));
  }
}

function doGet(e) {
  return routeApi_(e);
}

function doPost(e) {
  return routeApi_(e);
}
