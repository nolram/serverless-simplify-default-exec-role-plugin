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

const sqsPolicyStatement = [{
  Effect: 'Allow',
  Action: [
    'sqs:ReceiveMessage',
    'sqs:DeleteMessage',
    'sqs:GetQueueAttributes'
  ],
  Resource: []
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

function joinSQSPolicyStatement(statements){
  const otherStatements = statements.filter(function(statement){
    if(statement.Action.includes('sqs:ReceiveMessage')
      && statement.Action.includes('sqs:DeleteMessage')
      && statement.Action.includes('sqs:GetQueueAttributes')){
      return false
    }
    return true
  });

  const sqsResources = statements.reduce((acc, statement) => {
    if(statement.Action.includes('sqs:ReceiveMessage')
      && statement.Action.includes('sqs:DeleteMessage')
      && statement.Action.includes('sqs:GetQueueAttributes')){
        console.log(statement.Resource);
        acc = acc.concat(statement.Resource);
        console.log(acc);
    }
    return acc;
  }, []);
  if(sqsResources.length > 0){
    sqsPolicyStatement[0].Resource = sqsResources;
    return otherStatements.concat(sqsPolicyStatement);
  }
  return otherStatements;
}

function simplifyBaseIAMLogGroups(serverless) {
  const resourceSection = serverless.service.provider.compiledCloudFormationTemplate.Resources;
  for (const key in resourceSection) {
    if (key === 'IamRoleLambdaExecution') {
      let statements = removeLogGroupStatement(resourceSection[key].Properties.Policies[0].PolicyDocument.Statement);
      statements = joinSQSPolicyStatement(statements);
      resourceSection[key].Properties.Policies[0].PolicyDocument.Statement = logsPolicyStatements.concat(statements);
    }
  }
}

module.exports = SimplifyDefaultExecRole;
