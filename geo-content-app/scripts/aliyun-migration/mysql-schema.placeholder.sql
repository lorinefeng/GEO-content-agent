-- Placeholder schema for a future Aliyun MySQL migration.
-- This file is intentionally not production-ready yet.

CREATE TABLE Article (
  id VARCHAR(64) PRIMARY KEY,
  mode VARCHAR(32) NOT NULL DEFAULT 'sku',
  subject_id VARCHAR(128) NULL,
  subject_name VARCHAR(255) NULL,
  subject_payload LONGTEXT NULL,
  source_json_raw LONGTEXT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(12,2) NOT NULL,
  product_id VARCHAR(128) NULL,
  strategy VARCHAR(64) NOT NULL,
  strategy_name VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  published_url VARCHAR(2048) NULL,
  product_payload LONGTEXT NULL,
  research_snapshot_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_article_strategy (strategy),
  KEY idx_article_created_at (created_at),
  KEY idx_article_product_id (product_id),
  KEY idx_article_mode_created_at (mode, created_at),
  KEY idx_article_subject_id (subject_id)
);

CREATE TABLE Template (
  mode VARCHAR(32) NOT NULL,
  strategy VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  prompt LONGTEXT NOT NULL,
  PRIMARY KEY (mode, strategy)
);

CREATE TABLE TemplateRevision (
  id VARCHAR(64) PRIMARY KEY,
  mode VARCHAR(32) NOT NULL DEFAULT 'sku',
  strategy VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  prompt LONGTEXT NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(64) NULL,
  KEY idx_template_revision_strategy (strategy),
  KEY idx_template_revision_changed_at (changed_at),
  KEY idx_template_revision_mode_strategy (mode, strategy)
);

CREATE TABLE ResearchSnapshot (
  id VARCHAR(64) PRIMARY KEY,
  mode VARCHAR(32) NOT NULL,
  strategy VARCHAR(64) NOT NULL,
  subject_id VARCHAR(128) NULL,
  queries_json LONGTEXT NULL,
  sources_json LONGTEXT NULL,
  summary_markdown LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_research_snapshot_subject_id (subject_id),
  KEY idx_research_snapshot_created_at (created_at)
);

CREATE TABLE ReferenceImageAsset (
  id VARCHAR(64) PRIMARY KEY,
  article_id VARCHAR(64) NULL,
  subject_id VARCHAR(128) NULL,
  mode VARCHAR(32) NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  origin_name VARCHAR(255) NULL,
  mime_type VARCHAR(128) NULL,
  public_url VARCHAR(2048) NOT NULL,
  r2_key VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reference_image_article_id (article_id),
  KEY idx_reference_image_subject_id (subject_id),
  KEY idx_reference_image_created_at (created_at)
);

CREATE TABLE QuestionPackage (
  id VARCHAR(64) PRIMARY KEY,
  article_id VARCHAR(64) NOT NULL UNIQUE,
  mode VARCHAR(32) NOT NULL DEFAULT 'sku',
  product_id VARCHAR(128) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  strategy VARCHAR(64) NOT NULL,
  strategy_name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'generated',
  error_message TEXT NULL,
  package_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_question_package_article_id (article_id),
  KEY idx_question_package_product_id (product_id),
  KEY idx_question_package_created_at (created_at),
  KEY idx_question_package_mode_product_id (mode, product_id)
);

CREATE TABLE User (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE RegistrationRequest (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  decided_by VARCHAR(64) NULL,
  KEY idx_registration_status (status)
);
