export type Dependency = {
    name: string;
    version: string;
};

export type VersionOptions = {
    mainPackage: Dependency;
    dependencies: Dependency[];
    metadata?: {
        createdBy?: string;
        createdAt?: Date;
        description?: string;
    };
};
