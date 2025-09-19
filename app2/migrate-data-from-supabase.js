"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
var fs_1 = require("fs");
// Load environment variables (create .env.migration or set in Replit secrets) dotenv.config({ path: ".env.migration" });
/* سكربت ترحيل بيانات من Supabase -> قاعدة خارجية الاستخدام: - ضع هذا الملف في مشروعك على Replit - اضبط المتغيرات في Secrets/ENV أو ملف .env.migration OLD_DB_URL  - اتصال Supabase (read-only) NEW_DB_URL  - اتصال قاعدة السيرفر (وجهة) CA_PATH     - (اختياري) مسار ملف PEM لشهادة الجذر ALLOW_INSECURE - "true" لتجاهل تحقق الشهادات (غير آمن) BATCH_SIZE  - عدد الصفوف لكل دفعة (افتراضي 500) TABLES      - (اختياري) قائمة الجداول مفصولة بفواصل

ملاحظات الأمان: - الأفضل توفير شهادة جذرية (CA) وترك rejectUnauthorized = true. - ALLOW_INSECURE=true يسمح بالاتصال مع شهادات self-signed (غير مستحسن). */
var LOG = { info: function (s) { return console.log("\u001B[36m[INFO]\u001B[0m ".concat(s)); }, ok: function (s) { return console.log("\u001B[32m[OK]\u001B[0m ".concat(s)); }, warn: function (s) { return console.log("\u001B[33m[WARN]\u001B[0m ".concat(s)); }, err: function (s) { return console.error("\u001B[31m[ERR]\u001B[0m ".concat(s)); }, };
var OLD_DB_URL = process.env.OLD_DB_URL;
var NEW_DB_URL = process.env.NEW_DB_URL;
var CA_PATH = process.env.CA_PATH || "";
var ALLOW_INSECURE = process.env.ALLOW_INSECURE === "true";
var BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "500", 10);
var TABLES_ENV = process.env.TABLES || "";
if (!OLD_DB_URL || !NEW_DB_URL) {
    LOG.err("Please set OLD_DB_URL and NEW_DB_URL environment variables.");
    process.exit(1);
}
var DEFAULT_TABLES = ["account_balances", "accounts", "actions", "approvals", "autocomplete_data", "channels", "daily_expense_summaries", "daily_expenses", "equipment", "finance_events", "finance_payments", "fund_transfers", "journals", "maintenance_schedules", "maintenance_tasks", "material_purchases", "materials", "messages", "notification_read_states", "print_settings", "project_fund_transfers", "projects", "report_templates", "supplier_payments", "suppliers", "system_events", "system_notifications", "tool_categories", "tool_cost_tracking", "tool_maintenance_logs", "tool_movements", "tool_notifications", "tool_purchase_items", "tool_reservations", "tool_stock", "tool_usage_analytics", "tools", "transaction_lines", "transactions", "users", "worker_attendance", "workers"];
var TABLES = TABLES_ENV ? TABLES_ENV.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : DEFAULT_TABLES;
function makeClient(connectionString) {
    var config = { connectionString: connectionString };
    if (CA_PATH) {
        try {
            var ca = fs_1.default.readFileSync(CA_PATH, { encoding: "utf8" });
            config.ssl = { rejectUnauthorized: true, ca: ca };
            LOG.info(Using, CA, file, from, $, { CA_PATH: CA_PATH });
        }
        catch (e) {
            LOG.err(Failed, to, read, CA, file, at, $, { CA_PATH: CA_PATH }, $, { e: e, : .message });
            process.exit(1);
        }
    }
    else if (ALLOW_INSECURE) {
        LOG.warn("ALLOW_INSECURE=true -> connecting with rejectUnauthorized=false (INSECURE)");
        config.ssl = { rejectUnauthorized: false };
    }
    else { // default: try secure connection, node will validate against system CAs config.ssl = { rejectUnauthorized: true }; }
        return new pg_1.Client(config);
    }
    function getColumnNames(client, table) {
        return __awaiter(this, void 0, void 0, function () { var q, column_name, FROM, information_schema, columns, WHERE, table_schema, AND, table_name, ORDER, BY, ordinal_position, res; return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    q = SELECT, table_schema = 'public', table_name = $1;
                    return [4 /*yield*/, client.query(q, [table])];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res.rows.map(function (r) { return r.column_name; })];
            }
        }); });
    }
    function chunk(arr, size) { var out = []; for (var i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size)); return out; }
    function migrateTable(oldClient, newClient, table) {
        return __awaiter(this, void 0, void 0, function () {
            var columns, colList, _loop_1, offset, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        LOG.info(Migrating, table, $, { table: table });
                        return [4 /*yield*/, getColumnNames(oldClient, table)];
                    case 1:
                        columns = _a.sent();
                        if (!columns.length) {
                            LOG.warn(table, $, { table: table }, has, no, columns, skipping);
                            return [2 /*return*/];
                        }
                        colList = columns.map(function (c) { return "${c}"; }).join(", ");
                        _loop_1 = function (offset) {
                            var q, public, r, rows, params, valuesSql, idx, _loop_2, _i, rows_1, row, insertSql, e_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        q = SELECT * FROM;
                                        "${table}";
                                        OFFSET;
                                        $;
                                        {
                                            offset;
                                        }
                                        LIMIT;
                                        $;
                                        {
                                            BATCH_SIZE;
                                        }
                                        ;
                                        return [4 /*yield*/, oldClient.query(q)];
                                    case 1:
                                        r = _b.sent();
                                        rows = r.rows;
                                        if (!rows.length)
                                            return [2 /*return*/, "break"];
                                        params = [];
                                        valuesSql = [];
                                        idx = 1;
                                        _loop_2 = function (row) {
                                            var placeholders = columns.map(function (col) {
                                                params.push(row[col]);
                                                return "$".concat(idx++);
                                            });
                                            valuesSql.push("(".concat(placeholders.join(","), ")"));
                                        };
                                        for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                                            row = rows_1[_i];
                                            _loop_2(row);
                                        }
                                        insertSql = "INSERT INTO public.\"".concat(table, "\" (").concat(colList, ") VALUES ").concat(valuesSql.join(","), " ON CONFLICT DO NOTHING");
                                        _b.label = 2;
                                    case 2:
                                        _b.trys.push([2, 6, , 8]);
                                        return [4 /*yield*/, newClient.query("BEGIN")];
                                    case 3:
                                        _b.sent();
                                        return [4 /*yield*/, newClient.query(insertSql, params)];
                                    case 4:
                                        _b.sent();
                                        return [4 /*yield*/, newClient.query("COMMIT")];
                                    case 5:
                                        _b.sent();
                                        LOG.ok("  migrated batch offset ".concat(offset, " (").concat(rows.length, " rows)"));
                                        return [3 /*break*/, 8];
                                    case 6:
                                        e_1 = _b.sent();
                                        return [4 /*yield*/, newClient.query("ROLLBACK").catch(function () { })];
                                    case 7:
                                        _b.sent();
                                        LOG.err("  insert error at offset ".concat(offset, ": ").concat(e_1.message));
                                        return [3 /*break*/, 8];
                                    case 8: return [2 /*return*/];
                                }
                            });
                        };
                        offset = 0;
                        _a.label = 2;
                    case 2:
                        if (!(offset < total)) return [3 /*break*/, 5];
                        return [5 /*yield**/, _loop_1(offset)];
                    case 3:
                        state_1 = _a.sent();
                        if (state_1 === "break")
                            return [3 /*break*/, 5];
                        _a.label = 4;
                    case 4:
                        offset += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        LOG.ok(Finished, $, { table: table });
                        return [2 /*return*/];
                }
            });
        });
    }
    function main() {
        return __awaiter(this, void 0, void 0, function () {
            var oldClient, newClient, _i, TABLES_1, t, e_2, e_3, e_4, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldClient = makeClient(OLD_DB_URL);
                        newClient = makeClient(NEW_DB_URL);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, 11, 18]);
                        LOG.info("Connecting to OLD DB...");
                        return [4 /*yield*/, oldClient.connect()];
                    case 2:
                        _a.sent();
                        LOG.ok("Connected to OLD DB");
                        LOG.info("Connecting to NEW DB...");
                        return [4 /*yield*/, newClient.connect()];
                    case 3:
                        _a.sent();
                        LOG.ok("Connected to NEW DB");
                        _i = 0, TABLES_1 = TABLES;
                        _a.label = 4;
                    case 4:
                        if (!(_i < TABLES_1.length)) return [3 /*break*/, 9];
                        t = TABLES_1[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, migrateTable(oldClient, newClient, t)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_2 = _a.sent();
                        LOG.err("Failed migrating ".concat(t, ": ").concat(e_2.message));
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9:
                        LOG.ok("Migration finished");
                        return [3 /*break*/, 18];
                    case 10:
                        e_3 = _a.sent();
                        LOG.err(Fatal, $, { e: e_3, : .message });
                        return [3 /*break*/, 18];
                    case 11:
                        _a.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, oldClient.end()];
                    case 12:
                        _a.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        e_4 = _a.sent();
                        return [3 /*break*/, 14];
                    case 14:
                        _a.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, newClient.end()];
                    case 15:
                        _a.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        e_5 = _a.sent();
                        return [3 /*break*/, 17];
                    case 17: return [7 /*endfinally*/];
                    case 18: return [2 /*return*/];
                }
            });
        });
    }
    // handle SIGINT gracefully process.on('SIGINT', async () => { LOG.warn('Interrupted, closing connections...'); process.exit(0); });
    main().catch(function (err) { LOG.err(Unhandled, error, $, { err: err, : .message }); process.exit(1); });
}
