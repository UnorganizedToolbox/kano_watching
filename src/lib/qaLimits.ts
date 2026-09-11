// 'use server' ファイルは async 関数以外を export できないため、
// Q&Aの保持件数などの定数はここに切り出す。
export const FAVORITE_QUESTION_LIMIT = 5;
export const RESOLVED_QUESTION_RETENTION_LIMIT = 20;
