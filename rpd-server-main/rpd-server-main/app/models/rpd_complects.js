const { exchange1C } = require("../modules/1cExchange");

class RpdComplects {
  constructor(pool) {
    this.pool = pool;
  }

  async findRpdComplect(data, userId) {
    try {
      const result = await this.pool.query(
        `
                SELECT rc.id 
                FROM rpd_complects rc
                INNER JOIN user_complect uc ON uc.complect_id = rc.id
                WHERE rc.faculty = $1
                AND rc.year = $2
                AND rc.education_form = $3
                AND rc.education_level = $4
                AND rc.profile = $5
                AND rc.direction = $6
                AND uc.user_id = $7
            `,
        [
          data.faculty,
          data.year,
          data.formEducation,
          data.levelEducation,
          data.profile,
          data.directionOfStudy,
          userId,
        ]
      );
      const resultId = result.rows[0];
      if (!resultId) return "NotFound";
      return resultId;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  async findRpdComplectMeta(complect_id) {
    try {
      const result = await this.pool.query(
        `
          SELECT *
          FROM rpd_complects
          WHERE id::text = $1::text
             OR uuid::text = $1::text
          LIMIT 1
        `,
        [complect_id]
      );
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  async findRpdComplectData(template_id) {
    try {
      const result = await this.pool.query(
        `
                SELECT * FROM rpd_complects
                WHERE ID = (
                    SELECT id_rpd_complect FROM rpd_profile_templates
                    WHERE id = $1
                )`,
        [template_id]
      );
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  async createRpdComplect({ data, userId }) {
    try {
      const apiData = {
        faculty: data.faculty,
        year: data.year,
        educationLevel: data.levelEducation,
        educationForm: data.formEducation,
        profile: data.profile,
        direction: data.directionOfStudy,
      };
      const RpdComplectId = await exchange1C(apiData, { userId });
      return RpdComplectId;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

async getAllRpdComplects({ sortBy = 'id', sortOrder = 'DESC', filters = {} } = {}) {
  try {
    // Маппинг: имя колонки из MRT → реальное имя в БД
    const columnMapping = {
      'id': 'id',
      'uuid': 'uuid',
      'faculty': 'faculty',
      'year': 'year',
      'formEducation': 'education_form',
      'levelEducation': 'education_level',
      'profile': 'profile',
      'directionOfStudy': 'direction',
      'lastSyncedAt': 'last_synced_at',
    };

    // Белый список полей для сортировки (защита от SQL-инъекций)
    const allowedSortFields = Object.keys(columnMapping);
    
    // Валидация поля сортировки и получение реального имени колонки
    const sortField = allowedSortFields.includes(sortBy) 
      ? columnMapping[sortBy] 
      : 'id';
    
    // Валидация направления сортировки
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Формирование WHERE clause для фильтров
    const whereClauses = [];
    const queryParams = [];
    let paramIndex = 1;

    // Маппинг для фильтров
    const filterColumnMapping = {
      'faculty': 'faculty',
      'directionOfStudy': 'direction',
      'profile': 'profile',
      'formEducation': 'education_form',
      'levelEducation': 'education_level',
      'year': 'year',
    };

    // Добавляем фильтры (только если они переданы и не пустые)
    for (const [filterKey, filterValue] of Object.entries(filters)) {
      if (filterValue && String(filterValue).trim()) {
        const dbColumn = filterColumnMapping[filterKey];
        if (dbColumn) {
          // Для текстовых полей используем ILIKE (нечувствительный к регистру поиск)
          if (['faculty', 'direction', 'profile'].includes(dbColumn)) {
            whereClauses.push(`${dbColumn} ILIKE $${paramIndex}`);
            queryParams.push(`%${String(filterValue).trim()}%`);
          } else {
            // Для числовых и точных совпадений
            whereClauses.push(`${dbColumn} = $${paramIndex}`);
            queryParams.push(String(filterValue).trim());
          }
          paramIndex++;
        }
      }
    }

    // Формируем WHERE clause
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';

    // SQL запрос с динамическими фильтрами и сортировкой
    const query = `
      SELECT 
        id,
        uuid,
        faculty,
        year,
        education_form as "formEducation",
        education_level as "levelEducation",
        profile,
        direction as "directionOfStudy",
        last_synced_at as "lastSyncedAt",
        has_pending_changes as "hasPendingChanges"
      FROM rpd_complects
      ${whereClause}
      ORDER BY ${sortField} ${order} NULLS LAST
    `;

    console.log('SQL Query:', query);
    console.log('Query Params:', queryParams);

    const result = await this.pool.query(query, queryParams);
    return result.rows;
  } catch (error) {
    console.error('Error in getAllRpdComplects:', error);
    throw new Error(error.message);
  }
}

  async getRopComplects(userId) {
    try {
      const result = await this.pool.query(
        `
            SELECT rc.id,
                    rc.uuid,
                    rc.faculty,
                    rc.year,
                    rc.education_form as "formEducation",
                    rc.education_level as "levelEducation",
                    rc.profile,
                    rc.direction as "directionOfStudy",
                    rc.last_synced_at as "lastSyncedAt",
                    rc.has_pending_changes as "hasPendingChanges"
            FROM rpd_complects rc
            INNER JOIN user_complect uc ON uc.complect_id = rc.id
            WHERE uc.user_id = $1
            ORDER BY rc.id DESC
            `,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  async deleteRpdComplect(ids) {
    try {
      const idStrings = Array.isArray(ids) ? ids.map((x) => String(x)) : [];
      if (idStrings.length === 0) {
        return { rowCount: 0 };
      }
      const result = await this.pool.query(
        `
          DELETE FROM rpd_complects
          WHERE id::text = ANY($1::text[])
             OR uuid::text = ANY($1::text[])
        `,
        [idStrings]
      );
      return result;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }
}

module.exports = RpdComplects;
