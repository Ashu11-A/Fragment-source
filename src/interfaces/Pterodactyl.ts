export interface NestObject {
  object: 'nest'
  attributes: {
    id: number
    uuid: string
    author: string
    name: string
    description: string
    created_at: Date | string
    updated_at: Date | string
  }
}

export interface EggObject {
  object: 'egg'
  attributes: {
    id: number
    uuid: string
    name: string
    nest: number
    author: string
    description: string
    docker_image: string
    config: {
      files: Record<string, boolean | string>
      startup: {
        done: string
        userInteraction: string[]
      }
      stop: string
      logs: {
        custom: boolean
        location: string
      }
      extends: null
    }
    startup: string
    script: {
      privileged: boolean
      install: string
      entry: string
      container: string
      extends: null
    }
    created_at: string
    updated_at: string
    relationships: {
      nest: NestObject
    }
  }
}

export interface UserObject {
  object: 'user'
  attributes: {
    id: number
    external_id: null | string
    uuid: string
    username: string
    email: string
    first_name: string
    last_name: string
    language: string
    root_admin: boolean
    '2fa': boolean
    created_at: string
    updated_at: string
  }
  meta: {
    resource: string
  }
}

export interface NodeAttributes {
  relationships: any
  id: number
  uuid: string
  public: boolean
  name: string
  description: string
  location_id: number
  fqdn: string
  scheme: string
  behind_proxy: boolean
  maintenance_mode: boolean
  memory: number
  memory_overallocate: number
  disk: number
  disk_overallocate: number
  upload_size: number
  daemon_listen: number
  daemon_sftp: number
  daemon_base: string
  created_at: string
  updated_at: string
  allocated_resources: {
    memory: number
    disk: number
  }
}
export interface NodeObject {
  object: 'node'
  attributes: NodeAttributes
}

export interface NodeConfigObject {
  debug: boolean
  uuid: string
  token_id: string
  token: string
  api: {
    host: string
    port: number
    ssl: {
      enabled: boolean
      cert: string
      key: string
    }
    upload_limit: number
  }
  system: {
    data: string
    sftp: {
      bind_port: number
    }
  }
  remote: string
}
