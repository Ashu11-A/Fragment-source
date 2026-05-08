use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbErr};

pub async fn init_db() -> Result<DatabaseConnection, DbErr> {
    Database::connect("sqlite://daemon.db?mode=rwc").await
}

pub async fn setup_schema(db: &DatabaseConnection) -> Result<(), DbErr> {
    let backend = db.get_database_backend();
    let schema = sea_orm::Schema::new(backend);

    let statement = schema
        .create_table_from_entity(crate::entities::docker::Entity)
        .if_not_exists()
        .to_owned();

    db.execute(backend.build(&statement)).await?;
    Ok(())
}
