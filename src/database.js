import mysql from "mysql";
import syncMysql from 'sync-mysql';
import { promisify } from "util";
import config from "./config.js";

const { db } = config;

const pool = mysql.createPool(db);
var connectionSync = new syncMysql(db);

pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Database connection was closed.");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("Database has to many connections");
    }
    if (err.code === "ECONNREFUSED") {
      console.error("Database connection was refused");
    }
  }

  if (connection) connection.release();
  console.log("DB is Connected");

  return;
});

// Promisify Pool Querys
pool.query = promisify(pool.query);

// Syncrhonus Pool Querys
pool.querySync = function(query){
  var result=new Array();
  try {
    result = connectionSync.query(query);
  } catch (error) {    
  }
  
  return result;
};

export default pool;