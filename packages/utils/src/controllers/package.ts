import type { PackageType } from '@/types/index.js'

export class Package {
  private static data: PackageType
  static setData(data: PackageType) {
    Package.data = data
  }

  static getData () {
    return (this.data ?? {})
  }
}
