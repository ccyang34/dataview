import sql from 'mssql';

const dbConfig = {
    server: '47.121.207.201',
    port: 1433,
    database: 'DB_K3SYNDB',
    user: 'ReadOnly',
    password: 'Xmshzh888!',
    options: {
        encrypt: false, // Set to true if using Azure
        trustServerCertificate: true, // For self-signed certificates
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getDbPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig).connect();
    }
    return poolPromise;
}
