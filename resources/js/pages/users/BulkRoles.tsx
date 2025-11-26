import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Shield, Check, Circle, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
}

interface Props {
  users: User[];
  roles: Role[];
}

export default function BulkRoles({ users, roles }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUserIds.length === 0) {
      toast.error('กรุณาเลือกผู้ใช้งานอย่างน้อย 1 คน');
      return;
    }

    if (!selectedRole) {
      toast.error('กรุณาเลือกบทบาท 1 บทบาท');
      return;
    }

    setProcessing(true);
    router.post(route('users.bulk-roles.update'), {
      userIds: selectedUserIds,
      roleName: selectedRole,
      action: 'sync' // Always sync for single role mode
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedUserIds([]);
        setSelectedRole(null);
        toast.success('อัปเดตบทบาทเรียบร้อยแล้ว');
        setProcessing(false);
      },
      onError: () => {
        setProcessing(false);
        toast.error('เกิดข้อผิดพลาดในการอัปเดต');
      },
      onFinish: () => setProcessing(false)
    });
  };

  return (
    <AppLayout
      breadcrumbs={[
        { title: 'การจัดการผู้ใช้งาน', href: '/users' },
        { title: 'จัดการบทบาทแบบกลุ่ม', href: '/users/bulk-roles' },
      ]}
    >
      <Head title="จัดการบทบาทแบบกลุ่ม" />

      <div className="p-4 md:p-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">จัดการบทบาทแบบกลุ่ม</h1>
            <p className="text-muted-foreground">กำหนดบทบาทให้กับผู้ใช้งานหลายคนพร้อมกัน (1 คน ต่อ 1 บทบาท)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left Column: User Selection */}
          <Card className="lg:col-span-2 flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  เลือกผู้ใช้งาน
                  <Badge variant="secondary" className="ml-2">
                    {selectedUserIds.length} คน
                  </Badge>
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาชื่อ หรืออีเมล..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/40">
                <Checkbox 
                  id="select-all"
                  checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                  onCheckedChange={toggleAllUsers}
                />
                <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                  เลือกทั้งหมด ({filteredUsers.length})
                </Label>
              </div>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      ไม่พบผู้ใช้งานที่ค้นหา
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className={cn(
                          "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                          selectedUserIds.includes(user.id) && "bg-primary/5"
                        )}
                        onClick={() => toggleUser(user.id)}
                      >
                        <Checkbox 
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{user.name}</p>
                            <div className="flex gap-1">
                              {user.roles.slice(0, 3).map(role => (
                                <Badge key={role.id} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                  {role.name}
                                </Badge>
                              ))}
                              {user.roles.length > 3 && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                  +{user.roles.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column: Role Selection & Actions */}
          <div className="flex flex-col gap-6 h-full">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  เลือกบทบาท
                </CardTitle>
                <CardDescription>
                  เลือกบทบาทที่ต้องการกำหนด (เลือกได้เพียง 1 บทบาท)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                <ScrollArea className="h-[300px] lg:h-auto pr-4">
                  <div className="space-y-2">
                    {roles.map((role) => {
                      const isSelected = selectedRole === role.name;
                      return (
                        <div 
                          key={role.id} 
                          className={cn(
                            "flex items-center space-x-3 border p-3 rounded-md cursor-pointer transition-all",
                            isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
                          )}
                          onClick={() => setSelectedRole(role.name)}
                        >
                          <div className={cn(
                            "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-transparent"
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <Label 
                            className="flex-1 cursor-pointer font-medium"
                          >
                            {role.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex-col gap-3 border-t pt-6">
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md w-full">
                  <div className="flex gap-2">
                    <ArrowRightLeft className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                    <span>ระบบจะแทนที่บทบาทเดิมของผู้ใช้งานด้วยบทบาทที่เลือกใหม่ทันที</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={processing || selectedUserIds.length === 0 || !selectedRole}
                >
                  {processing ? 'กำลังดำเนินการ...' : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
