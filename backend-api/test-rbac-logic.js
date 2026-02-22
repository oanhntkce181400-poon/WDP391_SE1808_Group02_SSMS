/**
 * Test RBAC middleware with role matching
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Simulate the middleware check
function testRBACLogic() {
  console.log('🧪 Testing RBAC Role Matching Logic\n');

  // Simulated student auth payload
  const mockAuthPayload = {
    sub: '697ab37924dc848b87f25d0f',
    email: 'student@test.com',
    role: 'student'  // User's role
  };

  // Simulated required permissions (from rbacMiddleware(['student']))
  const requiredPermissions = ['student'];
  
  const userRole = String(mockAuthPayload.role || '').toLowerCase();
  const commonRoles = ['admin', 'staff', 'student'];
  const directRoleMatches = requiredPermissions.filter(perm => commonRoles.includes(perm));

  console.log('👤 Mock User:');
  console.log('   Email:', mockAuthPayload.email);
  console.log('   Role:', mockAuthPayload.role);
  console.log('');

  console.log('🔐 Required Permissions:', requiredPermissions);
  console.log('📊 Direct Role Matches Found:', directRoleMatches);
  console.log('');

  if (directRoleMatches.length > 0 && directRoleMatches.length === requiredPermissions.length) {
    console.log('✅ Check Type: Direct Role Matching');
    
    if (directRoleMatches.includes(userRole)) {
      console.log('✅ Result: ALLOWED');
      console.log('   User role "' + userRole + '" matches required "' + directRoleMatches[0] + '"');
    } else {
      console.log('❌ Result: DENIED');
      console.log('   Required:', directRoleMatches);
      console.log('   User has:', userRole);
    }
  } else {
    console.log('ℹ️  Check Type: Permission Lookup (not applicable here)');
  }

  console.log('\n✅ RBAC Logic Test Complete');
}

testRBACLogic();
