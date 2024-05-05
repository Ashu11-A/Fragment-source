import path from "path"

export const PKG_MODE = `${process.cwd()}/src` === __dirname ? false : true
export const RootPATH = PKG_MODE ? path.join(process.cwd()) : path.join(__dirname)