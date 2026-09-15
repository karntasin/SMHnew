App Script  https://script.google.com/u/0/home/projects/1TDMBbf-6MLgLAje5RAcSBB_uJR5dd4YFbKbbPDak-64-B29rVkCdNvT2/edit 
 code.gs
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
   WEB APP
========================================================== */

function doGet() {

  return HtmlService
    .createHtmlOutputFromFile('LIFF_TEST')
    .setTitle('LIFF Connection Test')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );

}


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
              idToken

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
     */

    if (
      String(
        data.client_id
      )
      !==
      String(
        CONFIG.LINE_CHANNEL_ID
      )
    ) {

      return {

        success: false,

        error:
          'LINE Channel ID ไม่ตรงกับระบบ'

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


  return users;

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


      const otherUser =
        getUserById(
          otherUserId
        );


      result.push({

        conversationId:
          row[idx.conversationId],

        user1Id:
          user1,

        user2Id:
          user2,

        otherUser:
          otherUser,

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

    return (

      new Date(b.updatedAt).getTime()

      -

      new Date(a.updatedAt).getTime()

    );

  });


  return result;

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
    conversationId
  );

}


function getMessages(
  conversationId
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


  for (
    let i = 1;
    i < data.length;
    i++
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

  }


  messages.sort(function(a, b) {

    return (

      new Date(a.timestamp).getTime()

      -

      new Date(b.timestamp).getTime()

    );

  });


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


index.html
<!DOCTYPE html>
<html lang="th">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Organization Chat</title>

  <!-- ======================================================
       LINE LIFF SDK
  ======================================================= -->

  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>


  <style>

    * {
      box-sizing: border-box;
    }


    html,
    body {

      margin: 0;

      padding: 0;

      width: 100%;

      min-height: 100%;

      font-family:
        Arial,
        "Noto Sans Thai",
        "Tahoma",
        sans-serif;

      background:
        linear-gradient(
          135deg,
          #eef2ff,
          #f8fafc,
          #ecfdf5
        );

      color: #111827;

    }


    body {

      min-height: 100vh;

      padding: 20px;

    }


    /* ======================================================
       APP
    ======================================================= */

    .app {

      width: 100%;

      max-width: 900px;

      margin: 0 auto;

    }


    /* ======================================================
       HEADER
    ======================================================= */

    .header {

      background: #ffffff;

      border-radius: 22px;

      padding: 22px;

      box-shadow:
        0 12px 35px
        rgba(15, 23, 42, 0.10);

      display: flex;

      align-items: center;

      justify-content: space-between;

      gap: 15px;

    }


    .brand {

      display: flex;

      align-items: center;

      gap: 14px;

    }


    .brand-icon {

      width: 54px;

      height: 54px;

      border-radius: 16px;

      background: #06c755;

      display: flex;

      align-items: center;

      justify-content: center;

      color: white;

      font-size: 28px;

    }


    .brand-title {

      font-size: 20px;

      font-weight: 800;

    }


    .brand-subtitle {

      margin-top: 3px;

      font-size: 13px;

      color: #64748b;

    }


    .connection {

      display: flex;

      align-items: center;

      gap: 8px;

      font-size: 13px;

      color: #64748b;

    }


    .dot {

      width: 10px;

      height: 10px;

      border-radius: 50%;

      background: #94a3b8;

    }


    .dot.online {

      background: #22c55e;

      box-shadow:
        0 0 0 4px
        rgba(34, 197, 94, 0.12);

    }


    /* ======================================================
       MAIN
    ======================================================= */

    .main {

      margin-top: 20px;

      display: grid;

      grid-template-columns:
        1fr;

      gap: 20px;

    }


    /* ======================================================
       CARD
    ======================================================= */

    .card {

      background: #ffffff;

      border-radius: 22px;

      padding: 24px;

      box-shadow:
        0 12px 35px
        rgba(15, 23, 42, 0.08);

    }


    .card-title {

      font-size: 17px;

      font-weight: 800;

      margin-bottom: 16px;

    }


    /* ======================================================
       STATUS
    ======================================================= */

    .status {

      padding: 16px;

      border-radius: 15px;

      font-weight: 700;

      line-height: 1.6;

      background: #f1f5f9;

      color: #334155;

    }


    .status.success {

      background: #dcfce7;

      color: #166534;

    }


    .status.warning {

      background: #fef3c7;

      color: #92400e;

    }


    .status.error {

      background: #fee2e2;

      color: #991b1b;

    }


    .status.info {

      background: #dbeafe;

      color: #1e40af;

    }


    /* ======================================================
       USER PROFILE
    ======================================================= */

    .profile {

      display: flex;

      align-items: center;

      gap: 16px;

      padding: 16px;

      border-radius: 18px;

      background: #f8fafc;

      margin-top: 18px;

    }


    .avatar {

      width: 62px;

      height: 62px;

      border-radius: 50%;

      object-fit: cover;

      background: #e2e8f0;

      display: flex;

      align-items: center;

      justify-content: center;

      font-size: 26px;

      overflow: hidden;

      flex-shrink: 0;

    }


    .avatar img {

      width: 100%;

      height: 100%;

      object-fit: cover;

    }


    .profile-name {

      font-weight: 800;

      font-size: 17px;

    }


    .profile-id {

      margin-top: 5px;

      color: #64748b;

      font-size: 12px;

      word-break: break-all;

    }


    /* ======================================================
       INFO GRID
    ======================================================= */

    .info-grid {

      display: grid;

      grid-template-columns:
        repeat(2, 1fr);

      gap: 12px;

      margin-top: 18px;

    }


    .info-item {

      padding: 14px;

      border-radius: 15px;

      background: #f8fafc;

      border: 1px solid #e2e8f0;

    }


    .info-label {

      font-size: 12px;

      color: #64748b;

      margin-bottom: 5px;

    }


    .info-value {

      font-size: 14px;

      font-weight: 700;

      word-break: break-word;

    }


    /* ======================================================
       BUTTONS
    ======================================================= */

    .buttons {

      display: grid;

      grid-template-columns:
        repeat(2, 1fr);

      gap: 12px;

      margin-top: 20px;

    }


    button {

      border: none;

      border-radius: 14px;

      padding: 14px;

      font-size: 15px;

      font-weight: 700;

      cursor: pointer;

      transition:
        transform .15s,
        opacity .15s;

    }


    button:hover {

      opacity: .92;

    }


    button:active {

      transform: scale(.98);

    }


    .btn-line {

      background: #06c755;

      color: white;

    }


    .btn-api {

      background: #2563eb;

      color: white;

    }


    .btn-profile {

      background: #334155;

      color: white;

    }


    .btn-logout {

      background: #dc2626;

      color: white;

    }


    .btn-test {

      background: #7c3aed;

      color: white;

    }


    .hidden {

      display: none !important;

    }


    /* ======================================================
       API RESULT
    ======================================================= */

    .api-result {

      margin-top: 18px;

      padding: 15px;

      border-radius: 15px;

      background: #0f172a;

      color: #e2e8f0;

      font-family: Consolas, monospace;

      font-size: 12px;

      white-space: pre-wrap;

      word-break: break-word;

      min-height: 70px;

    }


    /* ======================================================
       DEBUG
    ======================================================= */

    .debug-header {

      display: flex;

      align-items: center;

      justify-content: space-between;

      margin-bottom: 10px;

    }


    .debug {

      background: #020617;

      color: #cbd5e1;

      border-radius: 16px;

      padding: 16px;

      font-family: Consolas, monospace;

      font-size: 12px;

      line-height: 1.65;

      min-height: 180px;

      max-height: 360px;

      overflow-y: auto;

      white-space: pre-wrap;

      word-break: break-word;

    }


    .clear-btn {

      background: #475569;

      color: white;

      padding: 7px 12px;

      border-radius: 9px;

      font-size: 12px;

    }


    /* ======================================================
       FOOTER
    ======================================================= */

    .footer {

      text-align: center;

      margin-top: 20px;

      color: #64748b;

      font-size: 12px;

      padding-bottom: 20px;

    }


    /* ======================================================
       MOBILE
    ======================================================= */

    @media (
      max-width: 600px
    ) {

      body {

        padding: 10px;

      }


      .header {

        padding: 18px;

      }


      .brand-title {

        font-size: 18px;

      }


      .connection {

        display: none;

      }


      .card {

        padding: 18px;

        border-radius: 18px;

      }


      .info-grid {

        grid-template-columns:
          1fr;

      }


      .buttons {

        grid-template-columns:
          1fr;

      }

    }

  </style>

</head>


<body>


<div class="app">


  <!-- =====================================================
       HEADER
  ====================================================== -->

  <div class="header">

    <div class="brand">

      <div class="brand-icon">
        💬
      </div>

      <div>

        <div class="brand-title">
          Organization Chat
        </div>

        <div class="brand-subtitle">
          LINE Login + Google Apps Script
        </div>

      </div>

    </div>


    <div class="connection">

      <span
        id="connectionDot"
        class="dot"
      ></span>

      <span id="connectionText">
        กำลังตรวจสอบ...
      </span>

    </div>

  </div>


  <!-- =====================================================
       MAIN
  ====================================================== -->

  <div class="main">


    <!-- ===================================================
         LIFF CARD
    ==================================================== -->

    <div class="card">

      <div class="card-title">
        🔐 LINE Login / LIFF
      </div>


      <div
        id="status"
        class="status"
      >

        กำลังเริ่มต้นระบบ...

      </div>


      <!-- PROFILE -->

      <div
        id="profile"
        class="profile hidden"
      >

        <div
          id="avatar"
          class="avatar"
        >
          👤
        </div>


        <div>

          <div
            id="displayName"
            class="profile-name"
          >
            -
          </div>


          <div
            id="userId"
            class="profile-id"
          >
            -
          </div>

        </div>

      </div>


      <!-- INFO -->

      <div class="info-grid">


        <div class="info-item">

          <div class="info-label">
            LIFF ID
          </div>

          <div
            id="liffId"
            class="info-value"
          >
            2011190976-nGVbTYZD
          </div>

        </div>


        <div class="info-item">

          <div class="info-label">
            LIFF Version
          </div>

          <div
            id="liffVersion"
            class="info-value"
          >
            -
          </div>

        </div>


        <div class="info-item">

          <div class="info-label">
            Environment
          </div>

          <div
            id="environment"
            class="info-value"
          >
            -
          </div>

        </div>


        <div class="info-item">

          <div class="info-label">
            Login Status
          </div>

          <div
            id="loginStatus"
            class="info-value"
          >
            -
          </div>

        </div>


        <div class="info-item">

          <div class="info-label">
            Email
          </div>

          <div
            id="email"
            class="info-value"
          >
            -
          </div>

        </div>


        <div class="info-item">

          <div class="info-label">
            LIFF Browser
          </div>

          <div
            id="inClient"
            class="info-value"
          >
            -
          </div>

        </div>


      </div>


      <!-- BUTTONS -->

      <div class="buttons">


        <button
          id="loginButton"
          class="btn-line hidden"
          onclick="loginWithLINE()"
        >

          🔐 เข้าสู่ระบบด้วย LINE

        </button>


        <button
          id="profileButton"
          class="btn-profile hidden"
          onclick="loadProfile()"
        >

          👤 โหลด Profile

        </button>


        <button
          id="logoutButton"
          class="btn-logout hidden"
          onclick="logoutLINE()"
        >

          🚪 Logout

        </button>


      </div>

    </div>



    <!-- ===================================================
         API CARD
    ==================================================== -->

    <div class="card">

      <div class="card-title">
        🔌 Google Apps Script API
      </div>


      <div class="info-item">

        <div class="info-label">
          API Endpoint
        </div>

        <div
          id="endpoint"
          class="info-value"
        >
          -
        </div>

      </div>


      <div class="buttons">

        <button
          class="btn-api"
          onclick="testAPI()"
        >

          🔌 ทดสอบ Apps Script API

        </button>


        <button
          class="btn-test"
          onclick="testUsersAPI()"
        >

          👥 ทดสอบ Users API

        </button>

      </div>


      <div
        id="apiResult"
        class="api-result"
      >

        ยังไม่ได้ทดสอบ API

      </div>

    </div>



    <!-- ===================================================
         DEBUG
    ==================================================== -->

    <div class="card">

      <div class="debug-header">

        <div class="card-title">
          🛠 Debug Log
        </div>


        <button
          class="clear-btn"
          onclick="clearDebug()"
        >

          Clear

        </button>

      </div>


      <div id="debug">
        กำลังเริ่มระบบ...
      </div>

    </div>


  </div>


  <div class="footer">

    Organization Chat V5.x

    <br>

    LIFF + Cloudflare + Google Apps Script

  </div>


</div>



<script>

/* ==========================================================
   CONFIGURATION
========================================================== */


/*
 * ----------------------------------------------------------
 * LIFF ID
 * ----------------------------------------------------------
 */

const LIFF_ID =
  '2011190976-nGVbTYZD';


/*
 * ----------------------------------------------------------
 * CLOUDFLARE URL
 * ----------------------------------------------------------
 *
 * URL นี้เป็นหน้าเว็บของ LIFF
 *
 * สำคัญ:
 * LINE Developers > LIFF
 * Endpoint URL
 *
 * ต้องใช้ URL นี้
 *
 */

const CLOUDFLARE_URL =
  'https://polished-river-f1bb.karntasin5.workers.dev/';


/*
 * ----------------------------------------------------------
 * GOOGLE APPS SCRIPT API
 * ----------------------------------------------------------
 */

const API_URL =
  'https://script.google.com/macros/s/AKfycbxUil1RQ-V6mdlYDzz717jStqQ1_QBtLy2bvSrX5ly3eJLUUJKHusdnFyCO1AFk7nme/exec';



/* ==========================================================
   DEBUG
========================================================== */

function debug(message) {

  const box =
    document.getElementById(
      'debug'
    );


  const time =
    new Date()
      .toLocaleTimeString(
        'th-TH'
      );


  box.textContent +=
    '\n[' +
    time +
    '] ' +
    message;


  box.scrollTop =
    box.scrollHeight;


  console.log(
    message
  );

}


/* ==========================================================
   CLEAR DEBUG
========================================================== */

function clearDebug() {

  document.getElementById(
    'debug'
  ).textContent =
    '';

}


/* ==========================================================
   SET STATUS
========================================================== */

function setStatus(
  message,
  type
) {

  const element =
    document.getElementById(
      'status'
    );


  element.textContent =
    message;


  element.className =
    'status ' +
    (
      type ||
      ''
    );

}


/* ==========================================================
   SET VALUE
========================================================== */

function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) {

    return;

  }


  element.textContent =

    value === undefined ||
    value === null ||
    value === ''

      ? '-'

      : value;

}


/* ==========================================================
   UPDATE CONNECTION
========================================================== */

function setConnection(
  online
) {

  const dot =
    document.getElementById(
      'connectionDot'
    );


  const text =
    document.getElementById(
      'connectionText'
    );


  if (online) {

    dot.classList.add(
      'online'
    );

    text.textContent =
      'Connected';

  }

  else {

    dot.classList.remove(
      'online'
    );

    text.textContent =
      'Disconnected';

  }

}


/* ==========================================================
   INITIALIZE LIFF
========================================================== */

async function initializeLIFF() {


  try {


    debug(
      'เริ่มต้นระบบ LIFF...'
    );


    /*
     * ตรวจ SDK
     */

    if (
      typeof liff ===
      'undefined'
    ) {

      throw new Error(
        'ไม่พบ LIFF SDK'
      );

    }


    debug(
      'พบ LIFF SDK'
    );


    debug(
      'LIFF ID = ' +
      LIFF_ID
    );


    /*
     * LIFF INIT
     */

    await liff.init({

      liffId:
        LIFF_ID,

      withLoginOnExternalBrowser:
        false

    });


    debug(
      'liff.init() สำเร็จ'
    );


    /*
     * VERSION
     */

    setValue(

      'liffVersion',

      liff.getVersion()

    );


    /*
     * ENVIRONMENT
     */

    const inClient =
      liff.isInClient();


    setValue(

      'inClient',

      inClient
        ? 'YES'
        : 'NO'

    );


    setValue(

      'environment',

      inClient
        ? 'LIFF Browser'
        : 'External Browser'

    );


    debug(

      'Environment = ' +

      (
        inClient
          ? 'LIFF Browser'
          : 'External Browser'
      )

    );


    /*
     * LOGIN STATUS
     */

    const loggedIn =
      liff.isLoggedIn();


    setValue(

      'loginStatus',

      loggedIn
        ? 'LOGIN'
        : 'NOT LOGIN'

    );


    debug(

      'Login Status = ' +

      (
        loggedIn
          ? 'LOGIN'
          : 'NOT LOGIN'
      )

    );


    /*
     * LOGIN สำเร็จ
     */

    if (loggedIn) {


      setStatus(

        '✅ LINE Login สำเร็จ',

        'success'

      );


      setConnection(
        true
      );


      document
        .getElementById(
          'profile'
        )
        .classList
        .remove(
          'hidden'
        );


      document
        .getElementById(
          'profileButton'
        )
        .classList
        .remove(
          'hidden'
        );


      document
        .getElementById(
          'logoutButton'
        )
        .classList
        .remove(
          'hidden'
        );


      await loadProfile();


      return;

    }


    /*
     * ยังไม่ได้ Login
     */

    setConnection(
      true
    );


    if (inClient) {


      setStatus(

        '⚠️ LIFF เชื่อมต่อสำเร็จ แต่ยังไม่ได้ Login',

        'warning'

      );


      debug(
        'อยู่ใน LIFF Browser'
      );


      /*
       * ใน LIFF Browser
       * ไม่จำเป็นต้องทำ redirect เอง
       */

      return;

    }


    /*
     * External Browser
     */

    setStatus(

      '⚠️ External Browser: กรุณา Login ด้วย LINE',

      'warning'

    );


    document
      .getElementById(
        'loginButton'
      )
      .classList
      .remove(
        'hidden'
      );


    debug(
      'External Browser: พร้อมสำหรับ LINE Login'
    );


  }

  catch (error) {


    console.error(
      error
    );


    setConnection(
      false
    );


    debug(

      'LIFF INIT ERROR = ' +

      (
        error.message ||
        error
      )

    );


    setStatus(

      '❌ LIFF Error: ' +

      (
        error.message ||
        error
      ),

      'error'

    );

  }

}


/* ==========================================================
   LINE LOGIN
========================================================== */

function loginWithLINE() {


  try {


    debug(
      'กำลังเปิด LINE Login...'
    );


    setStatus(

      'กำลังเปิด LINE Login...',

      'warning'

    );


    /*
     * สำคัญ
     *
     * ไม่กำหนด redirectUri
     *
     * ให้ LIFF จัดการ redirect
     */

    liff.login();


  }

  catch (error) {


    debug(

      'LOGIN ERROR = ' +

      (
        error.message ||
        error
      )

    );


    setStatus(

      '❌ LINE Login Error',

      'error'

    );

  }

}


/* ==========================================================
   LOAD PROFILE
========================================================== */

async function loadProfile() {


  try {


    if (
      !liff.isLoggedIn()
    ) {

      debug(
        'ยังไม่ได้ Login'
      );

      return;

    }


    debug(
      'กำลังโหลด LINE Profile...'
    );


    const profile =
      await liff.getProfile();


    /*
     * USER ID
     */

    setValue(

      'userId',

      profile.userId

    );


    /*
     * DISPLAY NAME
     */

    setValue(

      'displayName',

      profile.displayName

    );


    /*
     * AVATAR
     */

    if (
      profile.pictureUrl
    ) {


      const avatar =
        document.getElementById(
          'avatar'
        );


      avatar.innerHTML =

        '<img src="' +

        escapeHtml(
          profile.pictureUrl
        ) +

        '" alt="avatar">';

    }


    /*
     * EMAIL
     */

    try {


      const decoded =
        liff.getDecodedIDToken();


      if (
        decoded &&
        decoded.email
      ) {

        setValue(

          'email',

          decoded.email

        );

      }

    }

    catch (emailError) {

      debug(
        'ไม่สามารถอ่าน Email จาก ID Token'
      );

    }


    debug(
      'LINE User ID = ' +
      profile.userId
    );


    debug(
      'Display Name = ' +
      profile.displayName
    );


    /*
     * ส่งข้อมูลเข้า Apps Script
     *
     * ขั้นตอนนี้ใช้สำหรับสร้าง/ตรวจ Session
     */

    await loginToServer(
      profile
    );


  }

  catch (error) {


    debug(

      'PROFILE ERROR = ' +

      (
        error.message ||
        error
      )

    );


    setStatus(

      '❌ ไม่สามารถโหลด LINE Profile',

      'error'

    );

  }

}


/* ==========================================================
   LOGIN TO SERVER
========================================================== */

async function loginToServer(
  profile
) {


  try {


    debug(
      'กำลังส่ง LINE User ID ไปยัง Server...'
    );


    /*
     * NOTE:
     *
     * V5.x Code.gs ควรรองรับ action
     * login / lineLogin
     *
     */


    const response =
      await fetch(

        API_URL,

        {

          method:
            'POST',

          headers: {

            'Content-Type':
              'application/json'

          },

          body:
            JSON.stringify({

              action:
                'lineLogin',

              lineUserId:
                profile.userId,

              displayName:
                profile.displayName,

              pictureUrl:
                profile.pictureUrl ||
                ''

            })

        }

      );


    const text =
      await response.text();


    debug(
      'Server Response = ' +
      text
    );


    let data;


    try {

      data =
        JSON.parse(
          text
        );

    }

    catch (parseError) {

      throw new Error(
        'Server ไม่ได้ส่ง JSON'
      );

    }


    if (
      data.success
    ) {


      debug(
        'Server Login สำเร็จ'
      );


      /*
       * เก็บ Session Token
       */

      if (
        data.sessionToken
      ) {

        localStorage.setItem(

          'organization_chat_session',

          data.sessionToken

        );

      }


      setStatus(

        '✅ LINE Login + Server Session สำเร็จ',

        'success'

      );

    }

    else {


      debug(

        'Server Login ไม่สำเร็จ: ' +

        (
          data.error ||
          'Unknown error'
        )

      );

    }


  }

  catch (error) {


    /*
     * ถ้า API ถูก CORS Block
     * ไม่ให้ LINE Login พัง
     */

    debug(

      'SERVER LOGIN ERROR = ' +

      (
        error.message ||
        error
      )

    );


    debug(
      'LINE Login สำเร็จ แต่ Server Session ยังไม่สำเร็จ'
    );

  }

}


/* ==========================================================
   LOGOUT
========================================================== */

function logoutLINE() {


  try {


    localStorage.removeItem(
      'organization_chat_session'
    );


    if (
      liff.isLoggedIn()
    ) {

      liff.logout();

    }


    setValue(
      'loginStatus',
      'NOT LOGIN'
    );


    setValue(
      'userId',
      '-'
    );


    setValue(
      'displayName',
      '-'
    );


    setValue(
      'email',
      '-'
    );


    document
      .getElementById(
        'profile'
      )
      .classList
      .add(
        'hidden'
      );


    document
      .getElementById(
        'profileButton'
      )
      .classList
      .add(
        'hidden'
      );


    document
      .getElementById(
        'logoutButton'
      )
      .classList
      .add(
        'hidden'
      );


    document
      .getElementById(
        'loginButton'
      )
      .classList
      .remove(
        'hidden'
      );


    setStatus(

      'ออกจากระบบ LINE แล้ว',

      'warning'

    );


    debug(
      'Logout สำเร็จ'
    );


  }

  catch (error) {


    debug(

      'LOGOUT ERROR = ' +

      (
        error.message ||
        error
      )

    );

  }

}


/* ==========================================================
   TEST GOOGLE APPS SCRIPT API
========================================================== */

async function testAPI() {


  const resultBox =
    document.getElementById(
      'apiResult'
    );


  try {


    debug(
      'กำลังทดสอบ Apps Script Endpoint...'
    );


    debug(
      'Endpoint = ' +
      API_URL
    );


    resultBox.textContent =
      'กำลังเชื่อมต่อ...';


    /*
     * GET
     *
     * Code.gs ควรรองรับ doGet()
     */

    const response =
      await fetch(
        API_URL,
        {

          method:
            'GET',

          cache:
            'no-store'

        }
      );


    const text =
      await response.text();


    debug(
      'HTTP Status = ' +
      response.status
    );


    debug(
      'API Response = ' +
      text
    );


    resultBox.textContent =
      text;


    if (
      response.ok
    ) {

      setConnection(
        true
      );

    }


  }

  catch (error) {


    resultBox.textContent =

      'ERROR\n\n' +

      (
        error.message ||
        error
      );


    debug(

      'API ERROR = ' +

      (
        error.message ||
        error
      )

    );

  }

}


/* ==========================================================
   TEST USERS API
========================================================== */

async function testUsersAPI() {


  const resultBox =
    document.getElementById(
      'apiResult'
    );


  try {


    debug(
      'กำลังเรียก Users API...'
    );


    resultBox.textContent =
      'กำลังโหลด Users...';


    /*
     * GET
     *
     * ?action=getUsers
     */

    const url =

      API_URL +

      '?action=getUsers';


    const response =
      await fetch(

        url,

        {

          method:
            'GET',

          cache:
            'no-store'

        }

      );


    const text =
      await response.text();


    debug(
      'Users API Status = ' +
      response.status
    );


    debug(
      'Users API Response = ' +
      text
    );


    resultBox.textContent =
      text;


  }

  catch (error) {


    resultBox.textContent =

      'ERROR\n\n' +

      (
        error.message ||
        error
      );


    debug(

      'USERS API ERROR = ' +

      (
        error.message ||
        error
      )

    );

  }

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHtml(
  value
) {

  return String(
    value
  )

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );

}


/* ==========================================================
   PAGE LOAD
========================================================== */

window.addEventListener(

  'load',

  function() {


    debug(
      'Page loaded'
    );


    setValue(
      'liffId',
      LIFF_ID
    );


    setValue(
      'endpoint',
      API_URL
    );


    debug(
      'LIFF ID = ' +
      LIFF_ID
    );


    debug(
      'Current URL = ' +
      window.location.href
    );


    debug(
      'Cloudflare URL = ' +
      CLOUDFLARE_URL
    );


    debug(
      'Apps Script API = ' +
      API_URL
    );


    initializeLIFF();


  }

);

</script>


</body>

</html>


LIFT_TEST.html

<!DOCTYPE html>
<html lang="th">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>LIFF Connection Test V3</title>

  <!-- LINE LIFF SDK -->
  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>


  <style>

    * {
      box-sizing: border-box;
    }


    body {

      margin: 0;

      min-height: 100vh;

      padding: 20px;

      font-family:
        Arial,
        "Noto Sans Thai",
        sans-serif;

      background:
        linear-gradient(
          135deg,
          #eef2ff 0%,
          #f8fafc 50%,
          #ecfdf5 100%
        );

      display: flex;

      align-items: center;

      justify-content: center;

    }


    .container {

      width: 100%;

      max-width: 560px;

    }


    .card {

      background: #ffffff;

      border-radius: 24px;

      padding: 30px;

      box-shadow:
        0 20px 50px
        rgba(0, 0, 0, 0.12);

    }


    .logo {

      width: 70px;

      height: 70px;

      margin: 0 auto 15px;

      border-radius: 20px;

      background: #06c755;

      color: white;

      display: flex;

      align-items: center;

      justify-content: center;

      font-size: 36px;

    }


    h1 {

      margin: 0;

      text-align: center;

      font-size: 24px;

      color: #111827;

    }


    .subtitle {

      margin-top: 8px;

      text-align: center;

      color: #64748b;

      font-size: 14px;

    }


    .status {

      margin-top: 25px;

      padding: 16px;

      border-radius: 15px;

      text-align: center;

      font-weight: 600;

      line-height: 1.6;

      background: #f1f5f9;

      color: #334155;

    }


    .status.success {

      background: #dcfce7;

      color: #166534;

    }


    .status.warning {

      background: #fef3c7;

      color: #92400e;

    }


    .status.error {

      background: #fee2e2;

      color: #991b1b;

    }


    .info {

      margin-top: 20px;

      border: 1px solid #e5e7eb;

      border-radius: 16px;

      overflow: hidden;

    }


    .row {

      display: flex;

      gap: 15px;

      padding: 14px 16px;

      border-bottom:
        1px solid #e5e7eb;

    }


    .row:last-child {

      border-bottom: none;

    }


    .label {

      width: 145px;

      flex-shrink: 0;

      color: #64748b;

      font-size: 13px;

    }


    .value {

      flex: 1;

      color: #111827;

      font-weight: 600;

      font-size: 14px;

      word-break: break-all;

    }


    .button {

      width: 100%;

      margin-top: 20px;

      padding: 15px;

      border: none;

      border-radius: 14px;

      background: #06c755;

      color: white;

      font-size: 16px;

      font-weight: 600;

      cursor: pointer;

      transition: 0.2s;

    }


    .button:hover {

      background: #05b34c;

    }


    .button:active {

      transform: scale(0.98);

    }


    .button.secondary {

      background: #334155;

    }


    .button.danger {

      background: #dc2626;

    }


    .debug {

      margin-top: 20px;

    }


    .debug-title {

      font-weight: 700;

      margin-bottom: 8px;

      color: #334155;

    }


    #debug {

      background: #0f172a;

      color: #e2e8f0;

      padding: 15px;

      border-radius: 14px;

      font-family:
        Consolas,
        monospace;

      font-size: 12px;

      line-height: 1.6;

      white-space: pre-wrap;

      word-break: break-word;

      max-height: 260px;

      overflow-y: auto;

    }


    .hidden {

      display: none !important;

    }


    @media (max-width: 500px) {

      body {

        padding: 12px;

      }


      .card {

        padding: 20px;

        border-radius: 20px;

      }


      .row {

        display: block;

      }


      .label {

        width: auto;

        margin-bottom: 5px;

      }

    }

  </style>

</head>


<body>


<div class="container">

  <div class="card">


    <div class="logo">

      💬

    </div>


    <h1>

      🔐 LIFF Connection Test V3

    </h1>


    <div class="subtitle">

      Organization Chat

    </div>


    <div
      id="status"
      class="status"
    >

      กำลังตรวจสอบ LIFF...

    </div>


    <div class="info">


      <div class="row">

        <div class="label">

          LIFF ID

        </div>

        <div
          id="liffId"
          class="value"
        >

          2011190976-nGVbTYZD

        </div>

      </div>


      <div class="row">

        <div class="label">

          Environment

        </div>

        <div
          id="environment"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          LIFF Browser

        </div>

        <div
          id="inClient"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          Login Status

        </div>

        <div
          id="loginStatus"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          LINE User ID

        </div>

        <div
          id="userId"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          Display Name

        </div>

        <div
          id="displayName"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          Email

        </div>

        <div
          id="email"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          LIFF Version

        </div>

        <div
          id="liffVersion"
          class="value"
        >

          -

        </div>

      </div>


      <div class="row">

        <div class="label">

          Current URL

        </div>

        <div
          id="currentUrl"
          class="value"
        >

          -

        </div>

      </div>


    </div>


    <!-- LOGIN BUTTON -->

    <button
      id="loginButton"
      class="button hidden"
      onclick="loginWithLINE()"
    >

      เข้าสู่ระบบด้วย LINE

    </button>


    <!-- PROFILE BUTTON -->

    <button
      id="profileButton"
      class="button secondary hidden"
      onclick="loadProfile()"
    >

      โหลด LINE Profile

    </button>


    <!-- LOGOUT BUTTON -->

    <button
      id="logoutButton"
      class="button danger hidden"
      onclick="logoutLINE()"
    >

      Logout LINE

    </button>


    <div class="debug">

      <div class="debug-title">

        Debug Log

      </div>

      <div id="debug">

        เริ่มต้นระบบ...

      </div>

    </div>


  </div>

</div>



<script>


/* ==========================================================
   CONFIG
========================================================== */


const LIFF_ID =
  '2011190976-nGVbTYZD';


/*
 * Endpoint ที่ตั้งไว้ใน LINE Developers
 */

const ENDPOINT_URL =
  'https://script.google.com/macros/s/AKfycbxUil1RQ-V6mdlYDzz717jStqQ1_QBtLy2bvSrX5ly3eJLUUJKHusdnFyCO1AFk7nme/exec';



/* ==========================================================
   DEBUG
========================================================== */


function debug(message) {

  const box =
    document.getElementById(
      'debug'
    );


  const time =
    new Date()
      .toLocaleTimeString();


  box.textContent +=
    '\n[' +
    time +
    '] ' +
    message;


  box.scrollTop =
    box.scrollHeight;


  console.log(
    message
  );

}



/* ==========================================================
   STATUS
========================================================== */


function setStatus(
  message,
  type
) {

  const element =
    document.getElementById(
      'status'
    );


  element.textContent =
    message;


  element.className =
    'status ' +
    (
      type ||
      ''
    );

}



/* ==========================================================
   SET VALUE
========================================================== */


function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) {

    return;

  }


  element.textContent =
    (
      value === undefined ||
      value === null ||
      value === ''
    )
      ? '-'
      : value;

}



/* ==========================================================
   INITIALIZE
========================================================== */


async function initializeLIFF() {


  try {


    debug(
      'เริ่มต้น LIFF...'
    );


    setStatus(
      'กำลังเริ่มต้น LIFF...',
      ''
    );


    /*
     * Current URL
     */

    setValue(
      'currentUrl',
      window.location.href
    );


    /*
     * LIFF INIT
     */

    await liff.init({

      liffId:
        LIFF_ID,

      /*
       * External Browser
       * ไม่ให้ SDK Login อัตโนมัติ
       */

      withLoginOnExternalBrowser:
        false

    });


    debug(
      'liff.init() สำเร็จ'
    );


    /*
     * LIFF VERSION
     */

    setValue(

      'liffVersion',

      liff.getVersion()

    );


    /*
     * Environment
     */

    const inClient =
      liff.isInClient();


    setValue(

      'inClient',

      inClient
        ? 'YES'
        : 'NO'

    );


    setValue(

      'environment',

      inClient
        ? 'LIFF Browser'
        : 'External Browser'

    );


    debug(

      'Environment = ' +

      (
        inClient
          ? 'LIFF Browser'
          : 'External Browser'
      )

    );


    /*
     * LOGIN STATUS
     */

    const loggedIn =
      liff.isLoggedIn();


    setValue(

      'loginStatus',

      loggedIn
        ? 'LOGIN'
        : 'NOT LOGIN'

    );


    debug(

      'Login Status = ' +

      (
        loggedIn
          ? 'LOGIN'
          : 'NOT LOGIN'
      )

    );


    /*
     * ------------------------------------------------------
     * LOGIN แล้ว
     * ------------------------------------------------------
     */

    if (loggedIn) {


      setStatus(

        '✅ LINE Login สำเร็จ',

        'success'

      );


      document
        .getElementById(
          'logoutButton'
        )
        .classList
        .remove(
          'hidden'
        );


      await loadProfile();


      return;

    }


    /*
     * ------------------------------------------------------
     * ยังไม่ได้ Login
     * ------------------------------------------------------
     */


    if (inClient) {


      /*
       * ใน LIFF Browser
       * ไม่เรียก liff.login()
       */

      setStatus(

        '⚠️ LIFF เชื่อมต่อสำเร็จ แต่ยังไม่ได้ Login',

        'warning'

      );


      debug(

        'อยู่ใน LIFF Browser'

      );


      debug(

        'ไม่เรียก liff.login() ในขั้นตอนนี้'

      );


      return;

    }


    /*
     * ------------------------------------------------------
     * External Browser
     * ------------------------------------------------------
     */


    setStatus(

      '⚠️ External Browser: กรุณา Login ด้วย LINE',

      'warning'

    );


    document
      .getElementById(
        'loginButton'
      )
      .classList
      .remove(
        'hidden'
      );


    debug(

      'พร้อมสำหรับ LINE Login'

    );


  }

  catch (error) {


    console.error(
      error
    );


    debug(

      'LIFF INIT ERROR: ' +

      (
        error.message ||
        error
      )

    );


    setStatus(

      '❌ LIFF Error: ' +

      (
        error.message ||
        error
      ),

      'error'

    );

  }

}



/* ==========================================================
   LOGIN
========================================================== */


async function loginWithLINE() {


  try {


    debug(
      'เริ่ม LINE Login...'
    );


    setStatus(

      'กำลังเปิด LINE Login...',

      'warning'

    );


    /*
     * สำคัญ:
     *
     * ไม่กำหนด redirectUri
     *
     * LIFF จะใช้ Endpoint URL
     */

    liff.login();


  }

  catch (error) {


    console.error(
      error
    );


    debug(

      'LOGIN ERROR: ' +

      (
        error.message ||
        error
      )

    );


    setStatus(

      '❌ LINE Login Error: ' +

      (
        error.message ||
        error
      ),

      'error'

    );

  }

}



/* ==========================================================
   LOAD PROFILE
========================================================== */


async function loadProfile() {


  try {


    debug(
      'กำลังโหลด LINE Profile...'
    );


    if (
      !liff.isLoggedIn()
    ) {


      debug(
        'ยังไม่ได้ Login'
      );


      return;

    }


    const profile =
      await liff.getProfile();


    /*
     * USER ID
     */

    setValue(

      'userId',

      profile.userId

    );


    /*
     * DISPLAY NAME
     */

    setValue(

      'displayName',

      profile.displayName

    );


    debug(

      'LINE User ID = ' +

      profile.userId

    );


    debug(

      'Display Name = ' +

      profile.displayName

    );


    /*
     * Picture
     */

    if (
      profile.pictureUrl
    ) {

      debug(

        'Picture URL = ' +

        profile.pictureUrl

      );

    }


    /*
     * Email
     *
     * getDecodedIDToken()
     * จะใช้ได้เมื่อ Scope / ID Token
     * รองรับข้อมูลดังกล่าว
     */

    try {


      const decoded =
        liff.getDecodedIDToken();


      if (
        decoded &&
        decoded.email
      ) {


        setValue(

          'email',

          decoded.email

        );


        debug(

          'Email = ' +
          decoded.email

        );

      }

    }

    catch (emailError) {


      debug(

        'ไม่สามารถอ่าน Email จาก ID Token'

      );

    }


    /*
     * Profile Button
     */

    document
      .getElementById(
        'profileButton'
      )
      .classList
      .remove(
        'hidden'
      );


    /*
     * Logout
     */

    document
      .getElementById(
        'logoutButton'
      )
      .classList
      .remove(
        'hidden'
      );


    setStatus(

      '✅ LINE Login และ Profile สำเร็จ',

      'success'

    );

  }

  catch (error) {


    console.error(
      error
    );


    debug(

      'PROFILE ERROR: ' +

      (
        error.message ||
        error
      )

    );


    setStatus(

      '❌ โหลด Profile ไม่สำเร็จ: ' +

      (
        error.message ||
        error
      ),

      'error'

    );

  }

}



/* ==========================================================
   LOGOUT
========================================================== */


function logoutLINE() {


  try {


    debug(
      'กำลัง Logout...'
    );


    if (
      liff.isLoggedIn()
    ) {

      liff.logout();

    }


    setValue(
      'loginStatus',
      'NOT LOGIN'
    );


    setValue(
      'userId',
      '-'
    );


    setValue(
      'displayName',
      '-'
    );


    setValue(
      'email',
      '-'
    );


    document
      .getElementById(
        'logoutButton'
      )
      .classList
      .add(
        'hidden'
      );


    document
      .getElementById(
        'profileButton'
      )
      .classList
      .add(
        'hidden'
      );


    document
      .getElementById(
        'loginButton'
      )
      .classList
      .remove(
        'hidden'
      );


    setStatus(

      'ออกจากระบบ LINE แล้ว',

      'warning'

    );


    debug(
      'Logout สำเร็จ'
    );

  }

  catch (error) {


    debug(

      'LOGOUT ERROR: ' +

      (
        error.message ||
        error
      )

    );

  }

}



/* ==========================================================
   PAGE LOAD
========================================================== */


window.addEventListener(

  'load',

  function() {

    debug(
      'Page loaded'
    );


    debug(
      'LIFF ID = ' +
      LIFF_ID
    );


    debug(
      'Endpoint = ' +
      ENDPOINT_URL
    );


    initializeLIFF();

  }

);


</script>


</body>

</html>


cloudflare https://dash.cloudflare.com/84d22f9b1fb969859750af0ee9ff4f54/workers/services/view/organization-chat-api/production

worker.js
/**
 * ============================================================
 * ORGANIZATION CHAT
 * Cloudflare Worker API Proxy
 * VERSION 5.x FINAL
 * ============================================================
 *
 * หน้าที่:
 * 1. Health Check
 * 2. API Test
 * 3. Proxy ไป Google Apps Script
 * 4. CORS
 * 5. LINE / LIFF frontend support
 * 6. Users
 * 7. Conversations
 * 8. Messages
 * 9. Send Message
 * 10. Session
 *
 * Worker:
 * https://organization-chat-api.karntasin5.workers.dev
 *
 * Apps Script:
 * https://script.google.com/macros/s/AKfycbxUil1RQ-V6mdlYDzz717jStqQ1_QBtLy2bvSrX5ly3eJLUUJKHusdnFyCO1AFk7nme/exec
 * ============================================================
 */


/* ============================================================
   CONFIG
============================================================ */

const CONFIG = {

  VERSION: "5.x",

  SYSTEM: "Organization Chat Proxy",

  /*
   * Google Apps Script Web App
   */
  GAS_URL:
    "https://script.google.com/macros/s/AKfycbxUil1RQ-V6mdlYDzz717jStqQ1_QBtLy2bvSrX5ly3eJLUUJKHusdnFyCO1AFk7nme/exec",

  /*
   * LINE LIFF
   */
  LIFF_ID:
    "2011190976-nGVbTYZD",

  /*
   * Channel ID
   */
  CHANNEL_ID:
    "2011190976"

};


/* ============================================================
   CORS
============================================================ */

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Max-Age":
      "86400"

  };

}


/* ============================================================
   JSON RESPONSE
============================================================ */

function jsonResponse(
  data,
  status = 200
) {

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status,

      headers: {

        "Content-Type":
          "application/json; charset=UTF-8",

        ...corsHeaders()

      }

    }

  );

}


/* ============================================================
   HTML RESPONSE
============================================================ */

function htmlResponse(
  html,
  status = 200
) {

  return new Response(

    html,

    {

      status,

      headers: {

        "Content-Type":
          "text/html; charset=UTF-8",

        ...corsHeaders()

      }

    }

  );

}


/* ============================================================
   OPTIONS
============================================================ */

function handleOptions() {

  return new Response(
    null,
    {
      status: 204,
      headers: corsHeaders()
    }
  );

}


/* ============================================================
   HEALTH
============================================================ */

function healthResponse(
  request
) {

  const url =
    new URL(request.url);

  return jsonResponse({

    success: true,

    system:
      CONFIG.SYSTEM,

    version:
      CONFIG.VERSION,

    status:
      "online",

    worker:
      url.origin,

    liffId:
      CONFIG.LIFF_ID,

    timestamp:
      new Date().toISOString()

  });

}


/* ============================================================
   API TEST
============================================================ */

function apiTestResponse(
  request
) {

  const url =
    new URL(request.url);

  return jsonResponse({

    success: true,

    message:
      "Cloudflare Worker API ทำงานแล้ว",

    system:
      CONFIG.SYSTEM,

    version:
      CONFIG.VERSION,

    worker:
      url.origin,

    gas:
      CONFIG.GAS_URL,

    liffId:
      CONFIG.LIFF_ID,

    timestamp:
      new Date().toISOString()

  });

}


/* ============================================================
   GAS REQUEST
============================================================ */

async function requestGAS(
  action,
  params = {},
  method = "GET"
) {

  try {

    /*
     * --------------------------------------------------------
     * GET
     * --------------------------------------------------------
     */

    if (
      method === "GET"
    ) {

      const gasUrl =
        new URL(
          CONFIG.GAS_URL
        );

      gasUrl.searchParams.set(
        "action",
        action
      );

      Object.keys(params)
        .forEach(
          function(key) {

            const value =
              params[key];

            if (
              value !== undefined &&
              value !== null
            ) {

              gasUrl.searchParams.set(
                key,
                String(value)
              );

            }

          }
        );


      const response =
        await fetch(
          gasUrl.toString(),
          {

            method: "GET",

            redirect: "follow",

            headers: {

              "Accept":
                "application/json"

            }

          }
        );


      const text =
        await response.text();


      let data;

      try {

        data =
          JSON.parse(text);

      }

      catch (parseError) {

        data = {

          success:
            response.ok,

          raw:
            text

        };

      }


      return {

        ok:
          response.ok,

        status:
          response.status,

        data

      };

    }


    /*
     * --------------------------------------------------------
     * POST
     * --------------------------------------------------------
     */

    const response =
      await fetch(
        CONFIG.GAS_URL,
        {

          method: "POST",

          redirect: "follow",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              action,

              ...params

            })

        }
      );


    const text =
      await response.text();


    let data;

    try {

      data =
        JSON.parse(text);

    }

    catch (parseError) {

      data = {

        success:
          response.ok,

        raw:
          text

      };

    }


    return {

      ok:
        response.ok,

      status:
        response.status,

      data

    };

  }

  catch (error) {

    return {

      ok: false,

      status: 502,

      data: {

        success: false,

        error:
          "GAS request failed",

        message:
          error.message ||
          String(error)

      }

    };

  }

}


/* ============================================================
   GAS PROXY
============================================================ */

async function gasProxy(
  request
) {

  const url =
    new URL(request.url);


  /*
   * ----------------------------------------------------------
   * GET
   * ----------------------------------------------------------
   */

  if (
    request.method === "GET"
  ) {

    const action =
      url.searchParams.get(
        "action"
      ) ||
      "health";


    const params = {};


    for (
      const [
        key,
        value
      ]
      of url.searchParams.entries()
    ) {

      if (
        key !== "action"
      ) {

        params[key] =
          value;

      }

    }


    const result =
      await requestGAS(
        action,
        params,
        "GET"
      );


    return jsonResponse(

      {

        success:
          result.ok &&
          result.data &&
          result.data.success !== false,

        proxy:
          true,

        action,

        worker:
          new URL(
            request.url
          ).origin,

        gas:
          result.data,

        timestamp:
          new Date().toISOString()

      },

      result.ok
        ? 200
        : 502

    );

  }


  /*
   * ----------------------------------------------------------
   * POST
   * ----------------------------------------------------------
   */

  let body = {};

  try {

    body =
      await request.json();

  }

  catch (error) {

    return jsonResponse(

      {

        success: false,

        error:
          "Invalid JSON body"

      },

      400

    );

  }


  const action =
    body.action ||
    "health";


  delete body.action;


  const result =
    await requestGAS(
      action,
      body,
      "POST"
    );


  return jsonResponse(

    {

      success:
        result.ok &&
        result.data &&
        result.data.success !== false,

      proxy:
        true,

      action,

      worker:
        new URL(
          request.url
        ).origin,

      gas:
        result.data,

      timestamp:
        new Date().toISOString()

    },

    result.ok
      ? 200
      : 502

  );

}


/* ============================================================
   ROOT PAGE
============================================================ */

function rootPage(
  request
) {

  const url =
    new URL(request.url);


  return htmlResponse(`<!DOCTYPE html>

<html lang="th">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
Organization Chat API
</title>

<style>

body {

  margin: 0;

  padding: 30px;

  font-family:
    Arial,
    sans-serif;

  background:
    #f1f5f9;

  color:
    #0f172a;

}

.card {

  max-width:
    700px;

  margin:
    40px auto;

  background:
    white;

  padding:
    30px;

  border-radius:
    20px;

  box-shadow:
    0 15px 40px
    rgba(0,0,0,.10);

}

h1 {

  margin-top:
    0;

}

.ok {

  padding:
    15px;

  border-radius:
    12px;

  background:
    #dcfce7;

  color:
    #166534;

  font-weight:
    bold;

}

.item {

  padding:
    12px 0;

  border-bottom:
    1px solid #e5e7eb;

}

code {

  word-break:
    break-all;

}

a {

  color:
    #2563eb;

}

</style>

</head>

<body>

<div class="card">

<h1>
💬 Organization Chat
</h1>

<h2>
Cloudflare API Proxy V5.x
</h2>

<div class="ok">
✅ Cloudflare Worker ทำงานแล้ว
</div>

<div class="item">
<strong>Worker URL</strong><br>
<code>${url.origin}</code>
</div>

<div class="item">
<strong>LIFF ID</strong><br>
<code>${CONFIG.LIFF_ID}</code>
</div>

<div class="item">
<strong>Apps Script</strong><br>
<code>${CONFIG.GAS_URL}</code>
</div>

<div class="item">
<strong>Health</strong><br>
<a href="/health">
/health
</a>
</div>

<div class="item">
<strong>API Test</strong><br>
<a href="/api/test">
/api/test
</a>
</div>

<div class="item">
<strong>GAS Test</strong><br>
<a href="/api/gas?action=health">
/api/gas?action=health
</a>
</div>

<div class="item">
<strong>Users</strong><br>
<a href="/api/users">
/api/users
</a>
</div>

<div class="item">
<strong>Conversations</strong><br>
<code>
/api/conversations?userId=U001
</code>
</div>

<div class="item">
<strong>Messages</strong><br>
<code>
/api/messages?conversationId=C001
</code>
</div>

</div>

</body>

</html>`);

}


/* ============================================================
   ROUTER
============================================================ */

async function router(
  request
) {

  const url =
    new URL(request.url);


  /*
   * OPTIONS
   */

  if (
    request.method === "OPTIONS"
  ) {

    return handleOptions();

  }


  /*
   * ROOT
   */

  if (
    url.pathname === "/"
  ) {

    return rootPage(
      request
    );

  }


  /*
   * HEALTH
   */

  if (
    url.pathname === "/health"
  ) {

    return healthResponse(
      request
    );

  }


  /*
   * API TEST
   */

  if (
    url.pathname === "/api/test"
  ) {

    return apiTestResponse(
      request
    );

  }


  /*
   * ----------------------------------------------------------
   * GAS RAW PROXY
   * ----------------------------------------------------------
   */

  if (
    url.pathname === "/api/gas"
  ) {

    return gasProxy(
      request
    );

  }


  /*
   * ----------------------------------------------------------
   * USERS
   * ----------------------------------------------------------
   */

  if (
    url.pathname === "/api/users"
  ) {

    if (
      request.method === "GET"
    ) {

      const result =
        await requestGAS(
          "users",
          {},
          "GET"
        );


      return jsonResponse(

        result.data,

        result.ok
          ? 200
          : 502

      );

    }

  }


  /*
   * ----------------------------------------------------------
   * USER
   * ----------------------------------------------------------
   */

  if (
    url.pathname === "/api/user"
  ) {

    const userId =
      url.searchParams.get(
        "userId"
      );


    if (
      !userId
    ) {

      return jsonResponse(

        {

          success: false,

          error:
            "ไม่พบ userId"

        },

        400

      );

    }


    const result =
      await requestGAS(

        "user",

        {

          userId

        },

        "GET"

      );


    return jsonResponse(

      result.data,

      result.ok
        ? 200
        : 502

    );

  }


  /*
   * ----------------------------------------------------------
   * LINE LOGIN
   * ----------------------------------------------------------
   */

  if (
    url.pathname === "/api/line-login"
  ) {

    if (
      request.method !== "POST"
    ) {

      return jsonResponse(

        {

          success: false,

          error:
            "Method Not Allowed"

        },

        405

      );

    }


    return gasProxy(
      request
    );

  }


  /*
   * ----------------------------------------------------------
   * SESSION
   * ----------------------------------------------------------
   */

  if (
    url.pathname === "/api/session"
  ) {

    if (
      request.method === "GET"
    ) {

      const sessionId =
        url.searchParams.get(
          "sessionId"
        );


      if (
        !sessionId
      ) {

        return jsonResponse(

          {

            success: false,

            loggedIn: false,

            error:
              "ไม่พบ sessionId"

          },

          400

        );

      }


      const result =
        await requestGAS(

          "checkSession",

          {

            sessionId

          },

          "GET"

        );


      return jsonResponse(

        result.data,

        result.ok
          ? 200
          : 502

      );

    }


    return gasProxy(
      request
    );

  }


  /*
   * ----------------------------------------------------------
   * CONVERSATIONS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
    "/api/conversations"
  ) {

    if (
      request.method !== "GET"
    ) {

      return gasProxy(
        request
      );

    }


    const userId =
      url.searchParams.get(
        "userId"
      );


    if (
      !userId
    ) {

      return jsonResponse(

        {

          success: false,

          error:
            "ไม่พบ userId"

        },

        400

      );

    }


    const result =
      await requestGAS(

        "conversations",

        {

          userId

        },

        "GET"

      );


    return jsonResponse(

      result.data,

      result.ok
        ? 200
        : 502

    );

  }


  /*
   * ----------------------------------------------------------
   * SINGLE CONVERSATION
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
    "/api/conversation"
  ) {

    const user1Id =
      url.searchParams.get(
        "user1Id"
      );

    const user2Id =
      url.searchParams.get(
        "user2Id"
      );


    const result =
      await requestGAS(

        "conversation",

        {

          user1Id,

          user2Id

        },

        "GET"

      );


    return jsonResponse(

      result.data,

      result.ok
        ? 200
        : 502

    );

  }


  /*
   * ----------------------------------------------------------
   * MESSAGES
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
    "/api/messages"
  ) {

    if (
      request.method === "GET"
    ) {

      const conversationId =
        url.searchParams.get(
          "conversationId"
        );


      if (
        !conversationId
      ) {

        return jsonResponse(

          {

            success: false,

            error:
              "ไม่พบ conversationId"

          },

          400

        );

      }


      const result =
        await requestGAS(

          "messages",

          {

            conversationId

          },

          "GET"

        );


      return jsonResponse(

        result.data,

        result.ok
          ? 200
          : 502

      );

    }


    return gasProxy(
      request
    );

  }


  /*
   * ----------------------------------------------------------
   * SEND MESSAGE
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
    "/api/send-message"
  ) {

    if (
      request.method !== "POST"
    ) {

      return jsonResponse(

        {

          success: false,

          error:
            "Method Not Allowed"

        },

        405

      );

    }


    let body = {};

    try {

      body =
        await request.json();

    }

    catch (error) {

      return jsonResponse(

        {

          success: false,

          error:
            "Invalid JSON"

        },

        400

      );

    }


    body.action =
      "sendMessage";


    const result =
      await requestGAS(

        "sendMessage",

        body,

        "POST"

      );


    return jsonResponse(

      result.data,

      result.ok
        ? 200
        : 502

    );

  }


  /*
   * ----------------------------------------------------------
   * API GENERIC
   * ----------------------------------------------------------
   */

  if (
    url.pathname === "/api"
  ) {

    return jsonResponse({

      success: true,

      system:
        CONFIG.SYSTEM,

      version:
        CONFIG.VERSION,

      status:
        "online",

      endpoints: {

        health:
          "/health",

        test:
          "/api/test",

        gas:
          "/api/gas",

        users:
          "/api/users",

        user:
          "/api/user?userId=U001",

        lineLogin:
          "/api/line-login",

        session:
          "/api/session?sessionId=S001",

        conversations:
          "/api/conversations?userId=U001",

        conversation:
          "/api/conversation?user1Id=U001&user2Id=U002",

        messages:
          "/api/messages?conversationId=C001",

        sendMessage:
          "/api/send-message"

      },

      liff: {

        id:
          CONFIG.LIFF_ID,

        channelId:
          CONFIG.CHANNEL_ID

      },

      timestamp:
        new Date().toISOString()

    });

  }


  /*
   * ----------------------------------------------------------
   * 404
   * ----------------------------------------------------------
   */

  return jsonResponse(

    {

      success: false,

      error:
        "Endpoint not found",

      path:
        url.pathname,

      method:
        request.method,

      available:

        [

          "/",

          "/health",

          "/api",

          "/api/test",

          "/api/gas",

          "/api/users",

          "/api/user",

          "/api/line-login",

          "/api/session",

          "/api/conversations",

          "/api/conversation",

          "/api/messages",

          "/api/send-message"

        ]

    },

    404

  );

}


/* ============================================================
   MAIN
============================================================ */

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    try {

      return await router(
        request
      );

    }

    catch (error) {

      console.error(
        error
      );

      return jsonResponse(

        {

          success: false,

          error:
            "Worker Internal Error",

          message:
            error.message ||
            String(error),

          timestamp:
            new Date().toISOString()

        },

        500

      );

    }

  }

};

https://dash.cloudflare.com/84d22f9b1fb969859750af0ee9ff4f54/workers/services/view/polished-river-f1bb/production

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // =====================================================
    // หน้าแรก
    // =====================================================

    if (url.pathname === "/") {

      return new Response(`
<!DOCTYPE html>
<html lang="th">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Organization Chat - LIFF Test</title>

  <style>

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family:
        Arial,
        "Noto Sans Thai",
        sans-serif;
      background:
        linear-gradient(
          135deg,
          #eef2ff,
          #f8fafc,
          #ecfdf5
        );
    }

    .card {
      width: 90%;
      max-width: 550px;
      padding: 35px;
      background: white;
      border-radius: 24px;
      box-shadow:
        0 20px 50px
        rgba(0,0,0,.12);
      text-align: center;
    }

    .logo {
      font-size: 55px;
      margin-bottom: 10px;
    }

    h1 {
      margin: 0;
      color: #111827;
    }

    h2 {
      color: #64748b;
      font-weight: 500;
    }

    .success {
      margin: 25px 0;
      padding: 15px;
      border-radius: 14px;
      background: #dcfce7;
      color: #166534;
      font-weight: bold;
    }

    .url {
      margin: 20px 0;
      padding: 15px;
      background: #f1f5f9;
      border-radius: 12px;
      word-break: break-all;
      font-size: 14px;
    }

    .button {
      display: block;
      margin-top: 20px;
      padding: 15px;
      border-radius: 14px;
      background: #06c755;
      color: white;
      text-decoration: none;
      font-weight: bold;
    }

    .button:hover {
      background: #05b34c;
    }

  </style>

</head>

<body>

  <div class="card">

    <div class="logo">
      💬
    </div>

    <h1>
      Organization Chat
    </h1>

    <h2>
      LIFF Test Server V4
    </h2>

    <div class="success">
      ✅ Cloudflare Worker ทำงานแล้ว
    </div>

    <div class="url">

      <strong>
        Worker URL
      </strong>

      <br><br>

      ${url.origin}

    </div>

    <a
      class="button"
      href="/api/test"
    >
      🔌 ทดสอบ Cloudflare API
    </a>

  </div>

</body>

</html>
      `, {

        status: 200,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        }

      });

    }


    // =====================================================
    // API TEST
    // =====================================================

    if (url.pathname === "/api/test") {

      return new Response(

        JSON.stringify({

          success: true,

          message:
            "Cloudflare Worker API ทำงานแล้ว",

          worker:
            url.origin,

          time:
            new Date().toISOString()

        }, null, 2),

        {

          status: 200,

          headers: {

            "Content-Type":
              "application/json; charset=UTF-8",

            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "GET, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type"

          }

        }

      );

    }


    // =====================================================
    // 404
    // =====================================================

    return new Response(

      "Not Found",

      {

        status: 404,

        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }

      }

    );

  }

};

