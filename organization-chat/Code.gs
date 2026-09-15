/************************************************************
 * ORGANIZATION CHAT — Code.gs (Full)
 * VERSION 5.4 + JSON API Router
 *
 * วิธีใช้:
 * 1. Copy ทั้งไฟล์นี้ไปวางใน Google Apps Script > Code.gs
 * 2. ใส่ SPREADSHEET_ID ใน CONFIG (ถ้าเป็น Standalone Script)
 * 3. Deploy > Web app > Execute as: Me > Anyone
 ************************************************************/
/************************************************************
 * ORGANIZATION CHAT
 * Google Apps Script
 *
 * VERSION 5.4
 *
 * ----------------------------------------------------------
 * FEATURES
 * ----------------------------------------------------------
 * 1. LINE LIFF Login
 * 2. LINE ID Token Verification
 * 3. Session
 * 4. Users
 * 5. Conversations
 * 6. Messages
 * 7. Send Message
 * 8. Mark Read
 * 9. Unread Count
 * 10. User Status
 * 11. Search Users
 * 12. Responsive Web App / LIFF
 *
 ************************************************************/


/* ==========================================================
   CONFIG
========================================================== */

const CONFIG = {

  /*
   * ถ้า Script ผูกกับ Spreadsheet
   * ให้เว้นว่าง
   *
   * ถ้าเป็น Standalone Script
   * ให้ใส่ Spreadsheet ID
   */
  SPREADSHEET_ID: '',


  /*
   * LINE LIFF
   */
  LINE_CHANNEL_ID: '2011190976',

  LINE_LIFF_ID: '2011190976-nGVbTYZD',


  /*
   * Session อายุ
   * CacheService สูงสุดประมาณ 6 ชั่วโมง
   */
  SESSION_SECONDS: 21600,


  /*
   * Sheet
   */
  SHEETS: {

    USERS: 'Users',

    CONVERSATIONS: 'Conversations',

    MESSAGES: 'Messages'

  }

};


/* ==========================================================
   SPREADSHEET
========================================================== */

function getSpreadsheet() {

  if (
    CONFIG.SPREADSHEET_ID &&
    String(CONFIG.SPREADSHEET_ID).trim()
  ) {

    return SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );

  }


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  if (!ss) {

    throw new Error(
      'ไม่พบ Google Spreadsheet'
    );

  }


  return ss;

}


/* ==========================================================
   GET SHEET
========================================================== */

function getSheet(sheetName) {

  const ss =
    getSpreadsheet();


  let sheet =
    ss.getSheetByName(sheetName);


  if (!sheet) {

    sheet =
      ss.insertSheet(sheetName);

  }


  return sheet;

}


/* ==========================================================
   ENSURE HEADERS
========================================================== */

function ensureHeaders(
  sheet,
  requiredHeaders
) {

  if (!sheet) {

    throw new Error(
      'ไม่พบ Sheet'
    );

  }


  if (
    !requiredHeaders ||
    requiredHeaders.length === 0
  ) {

    return;

  }


  /*
   * Sheet ใหม่
   */
  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(
        1,
        1,
        1,
        requiredHeaders.length
      )
      .setValues([
        requiredHeaders
      ]);

    return;

  }


  let lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );


  let headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  /*
   * Header ว่างทั้งหมด
   */
  const hasHeader =
    headers.some(function(h) {

      return String(h).trim() !== '';

    });


  if (!hasHeader) {

    sheet
      .getRange(
        1,
        1,
        1,
        requiredHeaders.length
      )
      .setValues([
        requiredHeaders
      ]);

    return;

  }


  /*
   * เพิ่ม Header ที่ไม่มี
   */
  requiredHeaders.forEach(function(requiredHeader) {

    const exists =
      headers.some(function(header) {

        return String(header).trim()
          ===
          String(requiredHeader).trim();

      });


    if (!exists) {

      const newColumn =
        sheet.getLastColumn() + 1;


      sheet
        .getRange(
          1,
          newColumn
        )
        .setValue(
          requiredHeader
        );


      headers.push(requiredHeader);

    }

  });

}


/* ==========================================================
   HEADER INDEX
========================================================== */

function getHeaderIndex(sheet) {

  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const index = {};


  headers.forEach(function(header, i) {

    const key =
      String(header).trim();


    if (key) {

      index[key] = i;

    }

  });


  return index;

}


/* ==========================================================
   INITIALIZE SYSTEM
========================================================== */

function initializeSystem() {

  /*
   * USERS
   */

  const users =
    getSheet(
      CONFIG.SHEETS.USERS
    );


  ensureHeaders(

    users,

    [
      'userId',
      'lineUserId',
      'displayName',
      'department',
      'email',
      'avatar',
      'status',
      'createdAt',
      'lastLogin'
    ]

  );


  /*
   * CONVERSATIONS
   */

  const conversations =
    getSheet(
      CONFIG.SHEETS.CONVERSATIONS
    );


  ensureHeaders(

    conversations,

    [
      'conversationId',
      'user1Id',
      'user2Id',
      'createdAt',
      'updatedAt'
    ]

  );


  /*
   * MESSAGES
   */

  const messages =
    getSheet(
      CONFIG.SHEETS.MESSAGES
    );


  ensureHeaders(

    messages,

    [
      'messageId',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'message',
      'timestamp',
      'isRead'
    ]

  );


  return {

    success: true,

    message:
      'Organization Chat V5.4 initialized'

  };

}


/* ==========================================================
   LINE LOGIN
========================================================== */

/*
 * รับ ID Token จาก LIFF
 *
 * index.html
 * ↓
 * liff.getIDToken()
 * ↓
 * authenticateWithLine()
 *
 */

function authenticateWithLine(
  idToken
) {

  if (!idToken) {

    throw new Error(
      'ไม่พบ LINE ID Token'
    );

  }


  /*
   * ตรวจสอบ Token กับ LINE
   */

  const lineProfile =
    verifyLineIdToken(
      idToken
    );


  if (!lineProfile.success) {

    throw new Error(
      lineProfile.error ||
      'LINE Login ไม่สำเร็จ'
    );

  }


  const lineUserId =
    lineProfile.sub;


  const displayName =
    lineProfile.name ||
    'LINE User';


  /*
   * ค้นหา User
   */

  let user =
    getUserByLineId(
      lineUserId
    );


  /*
   * ถ้ายังไม่มี User
   * สร้าง User อัตโนมัติ
   */

  if (!user) {

    user =
      createUserFromLine(
        lineUserId,
        displayName,
        lineProfile.picture
      );

  } else {

    updateUserProfileFromLine(
      user.userId,
      displayName,
      lineProfile.picture
    );

  }


  /*
   * Update Login
   */

  updateUserLogin(
    user.userId
  );


  /*
   * Session
   */

  const session =
    createSession({

      userId:
        user.userId,

      lineUserId:
        lineUserId,

      displayName:
        user.displayName

    });


  return {

    success: true,

    sessionToken:
      session.token,

    expiresAt:
      session.expiresAt,

    user:
      getUserById(
        user.userId
      )

  };

}


/* ==========================================================
   VERIFY LINE ID TOKEN
========================================================== */

function verifyLineIdToken(
  idToken
) {

  try {

    const response =
      UrlFetchApp.fetch(

        'https://api.line.me/oauth2/v2.1/verify',

        {

          method: 'post',

          payload: {

            id_token:
              idToken,

            client_id:
              CONFIG.LINE_CHANNEL_ID

          },

          muteHttpExceptions: true

        }

      );


    const status =
      response.getResponseCode();


    const text =
      response.getContentText();


    if (status !== 200) {

      return {

        success: false,

        error:
          'LINE Token verification failed: ' +
          text

      };

    }


    const data =
      JSON.parse(text);


    /*
     * ตรวจ Channel ID
     * LINE verify คืนค่า aud (ไม่ใช่ client_id)
     */

    const tokenChannelId =
      data.aud ||
      data.client_id;


    if (
      String(
        tokenChannelId
      )
      !==
      String(
        CONFIG.LINE_CHANNEL_ID
      )
    ) {

      return {

        success: false,

        error:
          'LINE Channel ID ไม่ตรงกับระบบ (token=' +
          tokenChannelId +
          ', config=' +
          CONFIG.LINE_CHANNEL_ID +
          ')'

      };

    }


    /*
     * ต้องมี sub
     */

    if (!data.sub) {

      return {

        success: false,

        error:
          'ไม่พบ LINE User ID'

      };

    }


    return {

      success: true,

      sub:
        data.sub,

      name:
        data.name || '',

      picture:
        data.picture || '',

      email:
        data.email || ''

    };

  }

  catch (error) {

    return {

      success: false,

      error:
        error.message

    };

  }

}


/* ==========================================================
   SESSION
========================================================== */

function createSession(data) {

  const token =
    Utilities
      .getUuid()
      .replace(/-/g, '')
      .toUpperCase();


  const now =
    new Date();


  const expiresAt =
    new Date(
      now.getTime()
      +
      CONFIG.SESSION_SECONDS * 1000
    );


  const sessionData = {

    userId:
      data.userId,

    lineUserId:
      data.lineUserId,

    displayName:
      data.displayName,

    createdAt:
      now.toISOString(),

    expiresAt:
      expiresAt.toISOString()

  };


  CacheService
    .getScriptCache()
    .put(

      'SESSION_' + token,

      JSON.stringify(
        sessionData
      ),

      CONFIG.SESSION_SECONDS

    );


  return {

    token:
      token,

    expiresAt:
      expiresAt.toISOString()

  };

}


/* ==========================================================
   GET SESSION
========================================================== */

function getSession(
  token
) {

  if (!token) {

    throw new Error(
      'SESSION_REQUIRED'
    );

  }


  const cache =
    CacheService
      .getScriptCache();


  const value =
    cache.get(
      'SESSION_' + token
    );


  if (!value) {

    throw new Error(
      'SESSION_EXPIRED'
    );

  }


  const session =
    JSON.parse(
      value
    );


  if (
    new Date(
      session.expiresAt
    ).getTime()
    <
    Date.now()
  ) {

    cache.remove(
      'SESSION_' + token
    );


    throw new Error(
      'SESSION_EXPIRED'
    );

  }


  return session;

}


/* ==========================================================
   LOGOUT
========================================================== */

function logout(
  sessionToken
) {

  if (!sessionToken) {

    return {

      success: true

    };

  }


  CacheService
    .getScriptCache()
    .remove(
      'SESSION_' + sessionToken
    );


  return {

    success: true

  };

}


/* ==========================================================
   CURRENT USER
========================================================== */

function apiGetCurrentUser(
  sessionToken
) {

  const session =
    getSession(
      sessionToken
    );


  const user =
    getUserById(
      session.userId
    );


  if (!user) {

    throw new Error(
      'ไม่พบข้อมูลผู้ใช้งาน'
    );

  }


  return user;

}


/* ==========================================================
   USERS
========================================================== */

function apiGetUsers(
  sessionToken
) {

  getSession(
    sessionToken
  );


  return getUsers();

}


function getUsers() {

  const sheet =
    getSheet(
      CONFIG.SHEETS.USERS
    );


  ensureHeaders(

    sheet,

    [
      'userId',
      'lineUserId',
      'displayName',
      'department',
      'email',
      'avatar',
      'status',
      'createdAt',
      'lastLogin'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  if (lastRow <= 1) {

    return [];

  }


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getValues();


  const headers =
    data[0];


  const users = [];


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const hasData =
      row.some(function(cell) {

        return cell !== '';

      });


    if (!hasData) {

      continue;

    }


    const user = {};


    headers.forEach(function(header, index) {

      const key =
        String(header).trim();


      if (!key) {

        return;

      }


      let value =
        row[index];


      if (
        value instanceof Date
      ) {

        value =
          value.toISOString();

      }


      user[key] =
        value;

    });


    if (!user.userId) {

      continue;

    }


    users.push(user);

  }


  return dedupeUsersByLineId_(users);

}


/**
 * กัน user ซ้ำจาก lineUserId เดียวกัน (เก็บตัวที่ login ล่าสุด)
 */
function dedupeUsersByLineId_(users) {

  const byLine = {};
  const noLine = [];

  users.forEach(function(user) {

    const key =
      String(user.lineUserId || '').trim();

    if (!key) {
      noLine.push(user);
      return;
    }

    const prev = byLine[key];

    if (!prev) {
      byLine[key] = user;
      return;
    }

    const tPrev = new Date(
      prev.lastLogin || prev.createdAt || 0
    ).getTime();

    const tNew = new Date(
      user.lastLogin || user.createdAt || 0
    ).getTime();

    byLine[key] = tNew >= tPrev ? user : prev;

  });

  return Object.keys(byLine)
    .map(function(k) {
      return byLine[k];
    })
    .concat(noLine);

}


/* ==========================================================
   GET USER BY ID
========================================================== */

function getUserById(
  userId
) {

  const users =
    getUsers();


  for (
    let i = 0;
    i < users.length;
    i++
  ) {

    if (
      String(
        users[i].userId
      )
      ===
      String(
        userId
      )
    ) {

      return users[i];

    }

  }


  return null;

}


/* ==========================================================
   GET USER BY LINE ID
========================================================== */

function getUserByLineId(
  lineUserId
) {

  const users =
    getUsers();


  for (
    let i = 0;
    i < users.length;
    i++
  ) {

    if (
      String(
        users[i].lineUserId
      )
      ===
      String(
        lineUserId
      )
    ) {

      return users[i];

    }

  }


  return null;

}


/* ==========================================================
   CREATE USER FROM LINE
========================================================== */

function createUserFromLine(

  lineUserId,

  displayName,

  picture

) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.USERS
    );


  ensureHeaders(

    sheet,

    [
      'userId',
      'lineUserId',
      'displayName',
      'department',
      'email',
      'avatar',
      'status',
      'createdAt',
      'lastLogin'
    ]

  );


  const userId =
    generateId(
      'U'
    );


  const now =
    new Date();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0];


  const row =
    headers.map(function(header) {

      switch (
        String(header).trim()
      ) {

        case 'userId':

          return userId;


        case 'lineUserId':

          return lineUserId;


        case 'displayName':

          return displayName;


        case 'department':

          return '';


        case 'email':

          return '';


        case 'avatar':

          return picture || '';


        case 'status':

          return 'online';


        case 'createdAt':

          return now;


        case 'lastLogin':

          return now;


        default:

          return '';

      }

    });


  sheet.appendRow(row);


  return {

    userId:
      userId,

    lineUserId:
      lineUserId,

    displayName:
      displayName,

    department:
      '',

    email:
      '',

    avatar:
      picture || '',

    status:
      'online',

    createdAt:
      now.toISOString(),

    lastLogin:
      now.toISOString()

  };

}


/* ==========================================================
   UPDATE USER LOGIN
========================================================== */

function updateUserProfileFromLine(
  userId,
  displayName,
  picture
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.USERS
    );


  ensureHeaders(

    sheet,

    [
      'userId',
      'lineUserId',
      'displayName',
      'department',
      'email',
      'avatar',
      'status',
      'createdAt',
      'lastLogin'
    ]

  );


  const idx =
    getHeaderIndex(
      sheet
    );


  const lastRow =
    sheet.getLastRow();


  for (
    let row = 2;
    row <= lastRow;
    row++
  ) {

    const currentId =
      String(
        sheet
          .getRange(
            row,
            idx.userId + 1
          )
          .getValue()
      );


    if (
      currentId !==
      String(userId)
    ) {
      continue;
    }

    if (
      displayName &&
      idx.displayName !== undefined
    ) {
      sheet
        .getRange(
          row,
          idx.displayName + 1
        )
        .setValue(
          displayName
        );
    }

    if (
      picture &&
      idx.avatar !== undefined
    ) {
      sheet
        .getRange(
          row,
          idx.avatar + 1
        )
        .setValue(
          picture
        );
    }

    return;

  }

}


function updateUserLogin(
  userId
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.USERS
    );


  ensureHeaders(

    sheet,

    [
      'userId',
      'lineUserId',
      'displayName',
      'department',
      'email',
      'avatar',
      'status',
      'createdAt',
      'lastLogin'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  if (lastRow <= 1) {

    return;

  }


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const idx =
    getHeaderIndex(
      sheet
    );


  for (
    let row = 2;
    row <= lastRow;
    row++
  ) {

    const currentId =
      String(
        sheet
          .getRange(
            row,
            idx.userId + 1
          )
          .getValue()
      );


    if (
      currentId ===
      String(userId)
    ) {

      if (
        idx.status !== undefined
      ) {

        sheet
          .getRange(
            row,
            idx.status + 1
          )
          .setValue(
            'online'
          );

      }


      if (
        idx.lastLogin !== undefined
      ) {

        sheet
          .getRange(
            row,
            idx.lastLogin + 1
          )
          .setValue(
            new Date()
          );

      }


      return;

    }

  }

}


/* ==========================================================
   UPDATE STATUS
========================================================== */

function apiUpdateUserStatus(

  sessionToken,

  status

) {

  const session =
    getSession(
      sessionToken
    );


  return updateUserStatus(

    session.userId,

    status

  );

}


function updateUserStatus(

  userId,

  status

) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.USERS
    );


  ensureHeaders(

    sheet,

    [
      'userId',
      'lineUserId',
      'displayName',
      'department',
      'email',
      'avatar',
      'status',
      'createdAt',
      'lastLogin'
    ]

  );


  const idx =
    getHeaderIndex(
      sheet
    );


  const lastRow =
    sheet.getLastRow();


  for (
    let row = 2;
    row <= lastRow;
    row++
  ) {

    const currentId =
      String(
        sheet
          .getRange(
            row,
            idx.userId + 1
          )
          .getValue()
      );


    if (
      currentId ===
      String(userId)
    ) {

      sheet
        .getRange(
          row,
          idx.status + 1
        )
        .setValue(
          status
        );


      return {

        success: true,

        userId:
          userId,

        status:
          status

      };

    }

  }


  throw new Error(
    'ไม่พบผู้ใช้งาน'
  );

}


/* ==========================================================
   SEARCH USERS
========================================================== */

function apiSearchUsers(

  sessionToken,

  keyword

) {

  getSession(
    sessionToken
  );


  const users =
    getUsers();


  const search =
    String(
      keyword || ''
    )
      .trim()
      .toLowerCase();


  if (!search) {

    return users;

  }


  return users.filter(function(user) {

    return (

      String(
        user.displayName || ''
      )
        .toLowerCase()
        .includes(search)

      ||

      String(
        user.department || ''
      )
        .toLowerCase()
        .includes(search)

    );

  });

}


/* ==========================================================
   CONVERSATION
========================================================== */

function apiGetConversation(

  sessionToken,

  user2Id

) {

  const session =
    getSession(
      sessionToken
    );


  return getOrCreateConversation(

    session.userId,

    user2Id

  );

}


function getOrCreateConversation(

  user1Id,

  user2Id

) {

  if (!user1Id || !user2Id) {

    throw new Error(
      'ไม่พบผู้ใช้งาน'
    );

  }


  if (
    String(user1Id)
    ===
    String(user2Id)
  ) {

    throw new Error(
      'ไม่สามารถสนทนากับตัวเองได้'
    );

  }


  const sheet =
    getSheet(
      CONFIG.SHEETS.CONVERSATIONS
    );


  ensureHeaders(

    sheet,

    [
      'conversationId',
      'user1Id',
      'user2Id',
      'createdAt',
      'updatedAt'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  if (lastRow > 1) {

    const data =
      sheet
        .getRange(
          1,
          1,
          lastRow,
          lastColumn
        )
        .getValues();


    const idx =
      getHeaderIndex(
        sheet
      );


    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      const a =
        String(
          data[i][
            idx.user1Id
          ] || ''
        );


      const b =
        String(
          data[i][
            idx.user2Id
          ] || ''
        );


      if (

        (
          a === String(user1Id) &&
          b === String(user2Id)
        )

        ||

        (
          a === String(user2Id) &&
          b === String(user1Id)
        )

      ) {

        return {

          success: true,

          conversationId:
            String(
              data[i][
                idx.conversationId
              ]
            )

        };

      }

    }

  }


  const conversationId =
    generateId(
      'C'
    );


  const now =
    new Date();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0];


  const row =
    headers.map(function(header) {

      switch (
        String(header).trim()
      ) {

        case 'conversationId':

          return conversationId;


        case 'user1Id':

          return user1Id;


        case 'user2Id':

          return user2Id;


        case 'createdAt':

          return now;


        case 'updatedAt':

          return now;


        default:

          return '';

      }

    });


  sheet.appendRow(row);


  return {

    success: true,

    conversationId:
      conversationId,

    created: true

  };

}


/* ==========================================================
   GET USER CONVERSATIONS
========================================================== */

function apiGetUserConversations(
  sessionToken
) {

  const session =
    getSession(
      sessionToken
    );


  return getUserConversations(
    session.userId
  );

}


function getUserConversations(
  userId
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.CONVERSATIONS
    );


  ensureHeaders(

    sheet,

    [
      'conversationId',
      'user1Id',
      'user2Id',
      'createdAt',
      'updatedAt'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  if (lastRow <= 1) {

    return [];

  }


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getValues();


  const idx =
    getHeaderIndex(
      sheet
    );


  /*
   * โหลด users ครั้งเดียว (เดิมเรียก getUserById ทุกแถว → ช้า)
   */
  const usersMap = {};

  getUsers().forEach(function(u) {
    usersMap[String(u.userId)] = u;
  });


  const meta =
    buildConversationMessageMeta_(
      userId
    );


  const result = [];


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const user1 =
      String(
        row[idx.user1Id] || ''
      );


    const user2 =
      String(
        row[idx.user2Id] || ''
      );


    if (

      user1 === String(userId)

      ||

      user2 === String(userId)

    ) {

      const otherUserId =
        user1 === String(userId)
          ? user2
          : user1;


      const conversationId =
        String(
          row[idx.conversationId] || ''
        );


      const last =
        meta.lastByConv[conversationId] ||
        null;


      result.push({

        conversationId:
          conversationId,

        user1Id:
          user1,

        user2Id:
          user2,

        otherUser:
          usersMap[String(otherUserId)] ||
          null,

        lastMessage:
          last ? last.message : '',

        lastMessageAt:
          last ? last.timestamp : '',

        unreadCount:
          meta.unreadByConv[conversationId] ||
          0,

        createdAt:
          formatDateValue(
            row[idx.createdAt]
          ),

        updatedAt:
          formatDateValue(
            row[idx.updatedAt]
          )

      });

    }

  }


  result.sort(function(a, b) {

    const ta =
      new Date(
        a.lastMessageAt || a.updatedAt || 0
      ).getTime();

    const tb =
      new Date(
        b.lastMessageAt || b.updatedAt || 0
      ).getTime();

    return tb - ta;

  });


  return result;

}


/**
 * สรุปข้อความล่าสุด + unread ต่อ conversation (อ่าน Messages ครั้งเดียว)
 */
function buildConversationMessageMeta_(
  userId
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.MESSAGES
    );


  ensureHeaders(

    sheet,

    [
      'messageId',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'message',
      'timestamp',
      'isRead'
    ]

  );


  const lastByConv = {};
  const unreadByConv = {};


  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {
    return {
      lastByConv: lastByConv,
      unreadByConv: unreadByConv
    };
  }


  const idx =
    getHeaderIndex(
      sheet
    );


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        sheet.getLastColumn()
      )
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const conversationId =
      String(
        row[idx.conversationId] || ''
      );


    if (!conversationId) {
      continue;
    }


    const timestamp =
      formatDateValue(
        row[idx.timestamp]
      );


    const message =
      String(
        row[idx.message] || ''
      );


    const prev =
      lastByConv[conversationId];


    if (
      !prev ||
      new Date(timestamp).getTime() >
      new Date(prev.timestamp || 0).getTime()
    ) {

      lastByConv[conversationId] = {
        message: message,
        timestamp: timestamp,
        senderId: row[idx.senderId]
      };

    }


    if (
      String(row[idx.receiverId] || '') ===
      String(userId) &&
      !toBoolean(row[idx.isRead])
    ) {

      unreadByConv[conversationId] =
        (unreadByConv[conversationId] || 0) + 1;

    }

  }


  return {
    lastByConv: lastByConv,
    unreadByConv: unreadByConv
  };

}


/**
 * Poll เบา ๆ: unread + conversations + ข้อความใหม่ตั้งแต่ since
 */
function apiPollInbox(
  sessionToken,
  conversationId,
  since
) {

  const session =
    getSession(
      sessionToken
    );


  const userId =
    session.userId;


  const conversations =
    getUserConversations(
      userId
    );


  const unread =
    conversations.reduce(function(sum, c) {
      return sum + (c.unreadCount || 0);
    }, 0);


  let messages = [];


  if (
    conversationId &&
    userBelongsToConversation(
      userId,
      conversationId
    )
  ) {

    const sinceMs =
      since
        ? new Date(since).getTime()
        : 0;


    const all =
      getMessages(
        conversationId,
        sinceMs > 0 ? 200 : 80
      );


    if (sinceMs > 0) {

      messages =
        all.filter(function(m) {
          return (
            new Date(m.timestamp).getTime() >
            sinceMs
          );
        });

    } else {

      messages = all;

    }

  }


  return {

    success: true,

    unread: unread,

    conversations: conversations,

    messages: messages,

    serverTime:
      new Date().toISOString()

  };

}


/* ==========================================================
   MESSAGES
========================================================== */

function apiGetMessages(

  sessionToken,

  conversationId

) {

  const session =
    getSession(
      sessionToken
    );


  /*
   * ตรวจว่าผู้ใช้มีสิทธิ์ใน Conversation
   */

  if (
    !userBelongsToConversation(

      session.userId,

      conversationId

    )
  ) {

    throw new Error(
      'ไม่มีสิทธิ์เข้าถึง Conversation นี้'
    );

  }


  return getMessages(
    conversationId,
    80
  );

}


function getMessages(
  conversationId,
  limit
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.MESSAGES
    );


  ensureHeaders(

    sheet,

    [
      'messageId',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'message',
      'timestamp',
      'isRead'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  if (lastRow <= 1) {

    return [];

  }


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getValues();


  const idx =
    getHeaderIndex(
      sheet
    );


  const messages = [];


  /*
   * อ่านจากท้ายชีตขึ้นมา (ข้อความใหม่มักอยู่ท้าย) เพื่อตัด limit ได้เร็วขึ้น
   */
  for (
    let i = data.length - 1;
    i >= 1;
    i--
  ) {

    const row =
      data[i];


    if (

      String(
        row[idx.conversationId] || ''
      )

      !==

      String(conversationId)

    ) {

      continue;

    }


    messages.push({

      messageId:
        row[idx.messageId],

      conversationId:
        row[idx.conversationId],

      senderId:
        row[idx.senderId],

      receiverId:
        row[idx.receiverId],

      messageType:
        row[idx.messageType] ||
        'text',

      message:
        row[idx.message] ||
        '',

      timestamp:
        formatDateValue(
          row[idx.timestamp]
        ),

      isRead:
        toBoolean(
          row[idx.isRead]
        )

    });


    if (
      limit &&
      messages.length >= Number(limit)
    ) {
      break;
    }

  }


  messages.reverse();


  return messages;

}


/* ==========================================================
   SEND MESSAGE
========================================================== */

function apiSendMessage(

  sessionToken,

  receiverId,

  message

) {

  const session =
    getSession(
      sessionToken
    );


  return sendMessage(

    session.userId,

    receiverId,

    message

  );

}


function sendMessage(

  senderId,

  receiverId,

  message

) {

  const cleanMessage =
    String(
      message || ''
    ).trim();


  if (!cleanMessage) {

    throw new Error(
      'กรุณาระบุข้อความ'
    );

  }


  const sender =
    getUserById(
      senderId
    );


  const receiver =
    getUserById(
      receiverId
    );


  if (!sender) {

    throw new Error(
      'ไม่พบผู้ส่ง'
    );

  }


  if (!receiver) {

    throw new Error(
      'ไม่พบผู้รับ'
    );

  }


  const conversation =
    getOrCreateConversation(

      senderId,

      receiverId

    );


  const conversationId =
    conversation.conversationId;


  const sheet =
    getSheet(
      CONFIG.SHEETS.MESSAGES
    );


  ensureHeaders(

    sheet,

    [
      'messageId',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'message',
      'timestamp',
      'isRead'
    ]

  );


  const messageId =
    generateId(
      'M'
    );


  const now =
    new Date();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0];


  const row =
    headers.map(function(header) {

      switch (
        String(header).trim()
      ) {

        case 'messageId':

          return messageId;


        case 'conversationId':

          return conversationId;


        case 'senderId':

          return senderId;


        case 'receiverId':

          return receiverId;


        case 'messageType':

          return 'text';


        case 'message':

          return cleanMessage;


        case 'timestamp':

          return now;


        case 'isRead':

          return false;


        default:

          return '';

      }

    });


  sheet.appendRow(row);


  updateConversationTime(
    conversationId
  );


  return {

    success: true,

    messageId:
      messageId,

    conversationId:
      conversationId,

    senderId:
      senderId,

    receiverId:
      receiverId,

    message:
      cleanMessage,

    timestamp:
      now.toISOString(),

    isRead:
      false

  };

}


/* ==========================================================
   CHECK CONVERSATION ACCESS
========================================================== */

function userBelongsToConversation(

  userId,

  conversationId

) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.CONVERSATIONS
    );


  ensureHeaders(

    sheet,

    [
      'conversationId',
      'user1Id',
      'user2Id',
      'createdAt',
      'updatedAt'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {

    return false;

  }


  const idx =
    getHeaderIndex(
      sheet
    );


  const lastColumn =
    sheet.getLastColumn();


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (

      String(
        data[i][idx.conversationId]
      )

      ===

      String(conversationId)

    ) {

      return (

        String(
          data[i][idx.user1Id]
        )

        ===

        String(userId)

        ||

        String(
          data[i][idx.user2Id]
        )

        ===

        String(userId)

      );

    }

  }


  return false;

}


/* ==========================================================
   UPDATE CONVERSATION TIME
========================================================== */

function updateConversationTime(
  conversationId
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.CONVERSATIONS
    );


  ensureHeaders(

    sheet,

    [
      'conversationId',
      'user1Id',
      'user2Id',
      'createdAt',
      'updatedAt'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {

    return;

  }


  const idx =
    getHeaderIndex(
      sheet
    );


  const lastColumn =
    sheet.getLastColumn();


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (

      String(
        data[i][idx.conversationId]
      )

      ===

      String(conversationId)

    ) {

      sheet
        .getRange(
          i + 1,
          idx.updatedAt + 1
        )
        .setValue(
          new Date()
        );


      return;

    }

  }

}


/* ==========================================================
   MARK READ
========================================================== */

function apiMarkRead(

  sessionToken,

  conversationId

) {

  const session =
    getSession(
      sessionToken
    );


  if (
    !userBelongsToConversation(

      session.userId,

      conversationId

    )
  ) {

    throw new Error(
      'ไม่มีสิทธิ์'
    );

  }


  markConversationAsRead(

    conversationId,

    session.userId

  );


  return {

    success: true

  };

}


function markConversationAsRead(

  conversationId,

  userId

) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.MESSAGES
    );


  ensureHeaders(

    sheet,

    [
      'messageId',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'message',
      'timestamp',
      'isRead'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {

    return;

  }


  const idx =
    getHeaderIndex(
      sheet
    );


  const lastColumn =
    sheet.getLastColumn();


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const conv =
      String(
        row[idx.conversationId] || ''
      );


    const receiver =
      String(
        row[idx.receiverId] || ''
      );


    if (

      conv === String(conversationId)

      &&

      receiver === String(userId)

      &&

      !toBoolean(
        row[idx.isRead]
      )

    ) {

      sheet
        .getRange(
          i + 1,
          idx.isRead + 1
        )
        .setValue(
          true
        );

    }

  }

}


/* ==========================================================
   UNREAD COUNT
========================================================== */

function apiGetUnreadCount(
  sessionToken
) {

  const session =
    getSession(
      sessionToken
    );


  return getUnreadCount(
    session.userId
  );

}


function getUnreadCount(
  userId
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.MESSAGES
    );


  ensureHeaders(

    sheet,

    [
      'messageId',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'message',
      'timestamp',
      'isRead'
    ]

  );


  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {

    return 0;

  }


  const idx =
    getHeaderIndex(
      sheet
    );


  const data =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        sheet.getLastColumn()
      )
      .getValues();


  let count = 0;


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (

      String(
        data[i][idx.receiverId] || ''
      )

      ===

      String(userId)

      &&

      !toBoolean(
        data[i][idx.isRead]
      )

    ) {

      count++;

    }

  }


  return count;

}


/* ==========================================================
   ID GENERATOR
========================================================== */

function generateId(
  prefix
) {

  return (

    String(prefix)

    +

    Utilities
      .getUuid()
      .replace(/-/g, '')
      .substring(0, 12)
      .toUpperCase()

  );

}


/* ==========================================================
   DATE
========================================================== */

function formatDateValue(
  value
) {

  if (
    value instanceof Date
  ) {

    return value.toISOString();

  }


  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return '';

  }


  return String(value);

}


/* ==========================================================
   BOOLEAN
========================================================== */

function toBoolean(
  value
) {

  if (value === true) {

    return true;

  }


  if (value === false) {

    return false;

  }


  const text =
    String(value)
      .trim()
      .toLowerCase();


  return (

    text === 'true'

    ||

    text === '1'

    ||

    text === 'yes'

    ||

    text === 'y'

  );

}


/* ==========================================================
   TEST LINE TOKEN
========================================================== */

function testLineVerify() {

  return {

    success: true,

    message:
      'LINE verification endpoint is ready',

    channelId:
      CONFIG.LINE_CHANNEL_ID,

    liffId:
      CONFIG.LINE_LIFF_ID

  };

}


/* ==========================================================
   TEST USERS
========================================================== */

function testUsers() {

  const result =
    getUsers();


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;

}


/* ==========================================================
   TEST CONVERSATION
========================================================== */

function testConversation() {

  const result =
    getOrCreateConversation(

      'U001',

      'U002'

    );


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;

}


/* ==========================================================
   TEST SEND MESSAGE
========================================================== */

function testSendMessage() {

  const result =
    sendMessage(

      'U001',

      'U002',

      'ทดสอบ Organization Chat V5.4'

    );


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;

}



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
          system: 'FSHH Chat',
          version: '5.5',
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
          } else {
            if (typeof updateUserProfileFromLine === 'function') {
              updateUserProfileFromLine(user.userId, displayName, pictureUrl);
            }
            if (typeof updateUserLogin === 'function') {
              updateUserLogin(user.userId);
            }
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

      case 'poll':
      case 'inbox':
      case 'pollInbox': {
        const token = getParam_(e, body, 'sessionToken', '');
        const conversationId = getParam_(e, body, 'conversationId', '');
        const since = getParam_(e, body, 'since', '');
        if (typeof apiPollInbox === 'function') {
          return jsonOut_(apiPollInbox(token, conversationId, since));
        }
        return fail_('apiPollInbox() not found');
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
            'markRead', 'unread', 'poll', 'searchUsers', 'updateStatus',
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
