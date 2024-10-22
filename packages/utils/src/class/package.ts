// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PackageType = Record<string, any>

export class Package {
  private static data: PackageType
  static setData(data: PackageType) {
    Package.data = data
  }

  static getData () {
    return (this.data ?? {})
  }
}
