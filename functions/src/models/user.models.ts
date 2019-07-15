import { AdminTheme } from './theme.models';

export type TanamUserRoleType = 'superAdmin' | 'admin' | 'publisher' | 'designer' | 'reviewer';

export interface UserPrefs {
  theme: AdminTheme;
  language: string;
}

export interface ITanamUser {
  uid: string;
  email: string;
  name: string;
  roles: TanamUserRoleType[];
  prefs: UserPrefs;
  photoUrl?: string;
  created: Date | any; // firebase.firestore.FieldValue | firebase.firestore.TimeStamp
  updated: Date | any;  // firebase.firestore.FieldValue | firebase.firestore.TimeStamp
}

export interface UserQueryOptions {
  limit?: number;
  orderBy?: {
    field: string,
    sortOrder: 'asc' | 'desc',
  };
  startAfter?: any; // firebase.firestore.DocumentSnapshot
}

export interface ITanamUserRole {
  id: string;
  uid?: string;
  name?: string;
  email: string;
  created: Date | any; // firebase.firestore.FieldValue | firebase.firestore.TimeStamp
  updated: Date | any;  // firebase.firestore.FieldValue | firebase.firestore.TimeStamp
  role: TanamUserRoleType;
}

export class TanamUser implements ITanamUser {
  uid: string;
  email: string;
  name: string;
  photoUrl: string;
  prefs: UserPrefs;
  roles: TanamUserRoleType[];
  created: Date | any; // firebase.firestore.FieldValue | firebase.firestore.TimeStamp
  updated: Date | any;  // firebase.firestore.FieldValue | firebase.firestore.TimeStamp

  constructor(json: ITanamUser) {
    this.uid = json.uid;
    this.email = json.email;
    this.photoUrl = json.photoUrl;
    this.prefs = json.prefs;
    this.roles = !!json.roles ? json.roles.slice() : [];
    this.created = json.created;
    this.updated = json.updated;
  }

  toJson() {
    return {
      uid: this.uid,
      email: this.email || null,
      name: this.name || null,
      photoUrl: this.photoUrl || null,
      prefs: this.prefs || null,
      roles: this.roles.slice(),
      created: this.created,
      updated: this.updated,
    } as ITanamUser;
  }

  toString() {
    return `${TanamUser.name}(${this.uid})`;
  }
}

export class TanamUserRole implements ITanamUserRole {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: TanamUserRoleType;
  created: Date | any;
  updated: Date | any;

  constructor(json: ITanamUserRole) {
    this.uid = json.uid;
    this.name = json.name;
    this.email = json.email;
    this.role = json.role;
    this.created = json.created;
    this.updated = json.updated;
  }

  toJson(): ITanamUserRole {
    return {
      id: this.id,
      uid: this.uid || null,
      name: this.name || null,
      email: this.email,
      role: this.role,
      created: this.created,
      updated: this.updated,
    } as ITanamUserRole;
  }

  toString() {
    return `${TanamUserRole.name}(${this.email}: ${this.role})`;
  }
}
