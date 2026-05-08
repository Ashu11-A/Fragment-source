use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "docker_instances")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub container_id: Option<String>,
    pub name: String,
    pub image: String,
    pub status: String,
    pub ports: Option<String>,
    pub env_vars: Option<String>,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
