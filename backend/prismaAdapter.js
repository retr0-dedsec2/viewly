import { prisma } from './prismaClient.mjs';

function serialize(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const out = { ...doc };

  for (const key of Object.keys(out)) {
    if (out[key] instanceof Date) {
      out[key] = out[key].toISOString();
    }
  }

  out._id = out.id || out.key;
  return out;
}

function serializeMany(items) {
  return items.map(serialize);
}

function cleanWhere(where = {}) {
  const out = {};
  for (const [key, value] of Object.entries(where || {})) {
    out[key === '_id' ? 'id' : key] = value;
  }
  return out;
}

function extractSet(update = {}) {
  return update.$set && typeof update.$set === 'object' ? update.$set : update;
}

function buildOrderBy(sortObject = {}) {
  return Object.entries(sortObject || {}).map(([field, direction]) => ({
    [field]: Number(direction) < 0 ? 'desc' : 'asc',
  }));
}

function prepareData(data = {}) {
  const out = { ...data };
  delete out._id;

  for (const key of [
    'createdAt',
    'updatedAt',
    'lastLoginAt',
    'importedAt',
    'firstPlayedAt',
    'lastPlayedAt',
  ]) {
    if (out[key] && typeof out[key] === 'string') {
      out[key] = new Date(out[key]);
    }
  }

  return out;
}

class QueryBuilder {
  constructor(model, where = {}) {
    this.model = model;
    this.where = cleanWhere(where);
    this.orderBy = undefined;
    this.take = undefined;
    this.skipValue = undefined;
  }

  sort(sortObject) {
    this.orderBy = buildOrderBy(sortObject);
    return this;
  }

  limit(value) {
    this.take = Number(value) || undefined;
    return this;
  }

  skip(value) {
    this.skipValue = Number(value) || undefined;
    return this;
  }

  async then(resolve, reject) {
    try {
      const result = await this.model.findMany({
        where: this.where,
        orderBy: this.orderBy,
        take: this.take,
        skip: this.skipValue,
      });

      resolve(serializeMany(result));
    } catch (error) {
      reject(error);
    }
  }
}

function createAdapter(model, options = {}) {
  const { primaryKey = 'id', uniqueKeys = ['id'] } = options;

  function uniqueWhere(where = {}) {
    const cleaned = cleanWhere(where);

    for (const key of uniqueKeys) {
      if (cleaned[key] !== undefined) return { [key]: cleaned[key] };
    }

    if (cleaned[primaryKey] !== undefined) {
      return { [primaryKey]: cleaned[primaryKey] };
    }

    return cleaned;
  }

  return {
    async ensureIndex() {
      return true;
    },

    find(where = {}) {
      return new QueryBuilder(model, where);
    },

    async findOne(where = {}) {
      return serialize(await model.findFirst({ where: cleanWhere(where) }));
    },

    async count(where = {}) {
      return model.count({ where: cleanWhere(where) });
    },

    async insert(data) {
      if (Array.isArray(data)) {
        const created = [];

        for (const item of data) {
          created.push(await model.create({ data: prepareData(item) }));
        }

        return serializeMany(created);
      }

      return serialize(await model.create({ data: prepareData(data) }));
    },

    async update(where = {}, update = {}) {
      const existing = await this.findOne(where);
      if (!existing) return 0;

      await model.update({
        where: uniqueWhere(existing),
        data: prepareData(extractSet(update)),
      });

      return 1;
    },

    async remove(where = {}) {
      const existing = await this.findOne(where);
      if (!existing) return 0;

      await model.delete({
        where: uniqueWhere(existing),
      });

      return 1;
    },
  };
}

export const usersDb = createAdapter(prisma.user, {
  primaryKey: 'id',
  uniqueKeys: ['id', 'email'],
});

export const playlistsDb = createAdapter(prisma.playlist, {
  primaryKey: 'id',
  uniqueKeys: ['id'],
});

export const tracksDb = createAdapter(prisma.track, {
  primaryKey: 'id',
  uniqueKeys: ['id', 'youtubeId'],
});

export const historyDb = createAdapter(prisma.history, {
  primaryKey: 'id',
  uniqueKeys: ['id'],
});

export const favoritesDb = createAdapter(prisma.favorite, {
  primaryKey: 'id',
  uniqueKeys: ['id'],
});

export const settingsDb = createAdapter(prisma.setting, {
  primaryKey: 'key',
  uniqueKeys: ['key'],
});

export const aiUsageDb = createAdapter(prisma.aiUsage, {
  primaryKey: 'id',
  uniqueKeys: ['id'],
});
