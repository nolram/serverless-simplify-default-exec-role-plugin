'use strict';

const logsPolicyStatements = [{
  Effect: 'Allow',
  Action: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
  Resource: [
    {
      'Fn::Sub': 'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:*'
    }
  ]
}];

class SimplifyDefaultExecRole {
  constructor(serverless) {
    this.hooks = {
      'before:package:finalize': function() {
        simplifyBaseIAMLogGroups(serverless);
      }
    };
  }
}

function removeLogGroupStatement(statements){
  return statements.filter(function(statement){
    if(statement.Action.includes('logs:CreateLogGroup')){
      return false
    }
    if(statement.Action.includes('logs:PutLogEvents')){
      return false
    }
    return true
  });
}

function simplifyBaseIAMLogGroups(serverless) {
  const resourceSection = serverless.service.provider.compiledCloudFormationTemplate.Resources;
  for (const key in resourceSection) {
    if (key === 'IamRoleLambdaExecution') {
      const statements = removeLogGroupStatement(resourceSection[key].Properties.Policies[0].PolicyDocument.Statement);
      resourceSection[key].Properties.Policies[0].PolicyDocument.Statement = logsPolicyStatements.concat(statements);
    }
  }
}

module.exports = SimplifyDefaultExecRole;
