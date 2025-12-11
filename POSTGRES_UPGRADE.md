# Aurora PostgreSQL Version Upgrade Guide

## Overview

This document describes the upgrade from Aurora PostgreSQL 15.5 to 16.6 and provides guidance for safe migration.

## What Changed

### Version Update
- **Previous Version**: Aurora PostgreSQL 15.5
- **New Version**: Aurora PostgreSQL 16.6
- **Change Location**: `lib/constructs/database/postgres.ts` line 47

### Code Change
```typescript
// Before
engine: rds.DatabaseClusterEngine.auroraPostgres({
  version: rds.AuroraPostgresEngineVersion.VER_15_5,
}),

// After
engine: rds.DatabaseClusterEngine.auroraPostgres({
  version: rds.AuroraPostgresEngineVersion.of('16.6', '16'),
}),
```

## Benefits of PostgreSQL 16.6

### Performance Improvements
- Enhanced query parallelization
- Improved indexing performance for large datasets
- Better memory management for vector operations (important for pgvector)
- Optimized VACUUM operations

### New Features
- Advanced SQL capabilities and query optimizations
- Enhanced monitoring and diagnostic features
- Better connection pooling and resource management
- Improved extension ecosystem support

### Security Enhancements
- Enhanced security features and authentication methods
- Improved privilege management
- Better audit logging capabilities

## Compatibility Verification

All components have been verified for PostgreSQL 16.6 compatibility:

### ✅ Database Extensions
- **pgvector**: Fully compatible with PostgreSQL 16.x
  - Used for embedding storage in RAG API
  - Tested with vector similarity search operations
  - No breaking changes from version 15.x

### ✅ Database Drivers
- **psycopg2**: Compatible with all PostgreSQL 16.x versions
  - Python database adapter used in Lambda functions
  - No code changes required

### ✅ Initialization Scripts
- **init_postgres.py**: Verified compatible
  - CREATE EXTENSION syntax unchanged
  - Role and privilege management commands compatible
  - Connection parameters unchanged

### ✅ Application Code
- **RAG API**: Compatible with PostgreSQL 16.6
- **LibreChat**: No direct PostgreSQL dependency (uses DocumentDB for main storage)

## Migration Scenarios

### Scenario 1: New Deployment (Recommended)
If you're deploying for the first time, simply deploy with the new configuration:

```bash
# Review changes
cdk diff

# Deploy
cdk deploy --all
```

The stack will automatically create Aurora PostgreSQL 16.6 cluster.

### Scenario 2: Upgrading Existing Deployment

⚠️ **WARNING**: Major version upgrades require careful planning and testing.

#### Pre-Upgrade Checklist
- [ ] Create a manual snapshot of your Aurora cluster
- [ ] Test the upgrade in a development/staging environment
- [ ] Review application logs for any PostgreSQL-specific queries
- [ ] Document current cluster configuration
- [ ] Plan a maintenance window (recommended: low-traffic period)
- [ ] Notify stakeholders of the upgrade schedule

#### Option A: Blue/Green Deployment (Zero Downtime - Recommended)

AWS Aurora supports Blue/Green deployments for zero-downtime upgrades:

```bash
# 1. Create a Blue/Green deployment via AWS Console or CLI
aws rds create-blue-green-deployment \
  --blue-green-deployment-name librechat-pg-upgrade \
  --source-arn arn:aws:rds:region:account:cluster:librechat-postgres-cluster \
  --target-engine-version 16.6 \
  --target-db-parameter-group-name default.aurora-postgresql16

# 2. Monitor the Green environment creation
aws rds describe-blue-green-deployments \
  --blue-green-deployment-identifier <deployment-id>

# 3. Test the Green environment thoroughly
# Update application to point to Green environment temporarily
# Verify all functionality works correctly

# 4. Perform switchover
aws rds switchover-blue-green-deployment \
  --blue-green-deployment-identifier <deployment-id> \
  --switchover-timeout 300

# 5. Monitor the switchover and verify application functionality
```

#### Option B: In-Place Upgrade (Requires Downtime)

1. **Create Backup**
   ```bash
   aws rds create-db-cluster-snapshot \
     --db-cluster-identifier librechat-postgres-cluster \
     --db-cluster-snapshot-identifier librechat-pg-pre-upgrade-$(date +%Y%m%d)
   ```

2. **Update CDK Code**
   - The postgres.ts file has already been updated to version 16.6
   - Review the changes in your repository

3. **Deploy the Update**
   ```bash
   # Review what will change
   cdk diff
   
   # Deploy the upgrade
   cdk deploy --all
   ```

4. **Monitor the Upgrade**
   - Watch CloudWatch Logs for the database cluster
   - Monitor the upgrade progress in RDS console
   - Typical upgrade time: 10-30 minutes depending on database size

5. **Verify Post-Upgrade**
   - Check that init-postgres Lambda runs successfully
   - Verify pgvector extension is installed: `SELECT * FROM pg_extension WHERE extname = 'vector';`
   - Test RAG API functionality
   - Monitor application logs for any errors

#### Option C: Fresh Deployment (Data Loss)

If your data is not critical or you have external backups:

1. **Export Critical Data** (if needed)
2. **Destroy Existing Stack**
   ```bash
   cdk destroy --all
   ```
3. **Deploy New Stack with PostgreSQL 16.6**
   ```bash
   cdk deploy --all
   ```

## Rollback Procedures

### If Upgrade Fails (Blue/Green)
```bash
# Cancel the Blue/Green deployment
aws rds delete-blue-green-deployment \
  --blue-green-deployment-identifier <deployment-id> \
  --delete-target
```

### If Upgrade Fails (In-Place)
```bash
# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier librechat-postgres-cluster-restored \
  --snapshot-identifier librechat-pg-pre-upgrade-YYYYMMDD \
  --engine aurora-postgresql \
  --engine-version 15.5
```

## Testing Recommendations

### Pre-Upgrade Testing
1. **Functional Testing**
   - Test RAG API vector search operations
   - Verify document embedding and retrieval
   - Test user authentication and authorization

2. **Performance Testing**
   - Run load tests on RAG API endpoints
   - Monitor query performance metrics
   - Compare response times with baseline

3. **Integration Testing**
   - Test LibreChat integration with RAG API
   - Verify end-to-end document processing workflows
   - Test error handling and edge cases

### Post-Upgrade Validation
```sql
-- Connect to PostgreSQL cluster
psql -h <cluster-endpoint> -U postgres -d rag_api

-- Verify PostgreSQL version
SELECT version();
-- Expected: PostgreSQL 16.6 on ... (x86_64-amazon-linux-gnu)

-- Check installed extensions
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify rag user exists
SELECT usename, usesuper FROM pg_user WHERE usename = 'rag';

-- Test vector operations (if data exists)
SELECT COUNT(*) FROM your_vector_table;
```

## Known Issues and Considerations

### Breaking Changes from PostgreSQL 15 to 16
As of PostgreSQL 16.6, there are no breaking changes that affect this application:
- All SQL syntax used in the application remains compatible
- pgvector extension maintains backward compatibility
- Connection parameters unchanged

### Performance Considerations
- Initial connection after upgrade may be slower (cache warming)
- Statistics collection will run automatically after upgrade
- Consider running `ANALYZE` on large tables after upgrade

### Monitoring After Upgrade
Monitor these metrics for 24-48 hours post-upgrade:
- Query response times (CloudWatch Metrics)
- Database connections (CloudWatch Metrics)
- Error rates in application logs
- RAG API endpoint performance
- Database CPU and memory utilization

## Configuration File Updates

### Updated Files
1. **lib/constructs/database/postgres.ts**
   - Engine version updated to 16.6
   - Added compatibility comments

2. **config/config.json**
   - Aurora engine version updated to "16.6"
   - Domain configuration enhanced with documentation

3. **README.md**
   - Added PostgreSQL 16.6 compatibility information
   - Updated troubleshooting guide
   - Added database version compatibility matrix

4. **src/lambda/init_postgres.py**
   - Added PostgreSQL 16.6 compatibility documentation
   - No code changes required (fully compatible)

## Support and Resources

- [AWS Aurora PostgreSQL 16 Release Notes](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html)
- [PostgreSQL 16 Official Documentation](https://www.postgresql.org/docs/16/index.html)
- [AWS Aurora Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments.html)
- [pgvector Extension Documentation](https://github.com/pgvector/pgvector)

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2025-12-11 | 16.6 | Upgraded from 15.5 to 16.6 |
| Previous | 15.5 | Initial version |

## Questions or Issues?

If you encounter any issues during or after the upgrade:
1. Check CloudWatch Logs for detailed error messages
2. Review this document for troubleshooting steps
3. Consult AWS Support if issues persist
4. Consider rolling back to snapshot if critical issues occur
