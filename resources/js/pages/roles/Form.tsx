import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, CheckSquare, Square, Search, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Permission {
  id: number;
  name: string;
  group: string;
}

interface Role {
  id?: number;
  name: string;
  permissions?: Permission[];
}

interface Props {
  role?: Role;
  groupedPermissions: Record<string, Permission[]>;
}

export default function RoleForm({ role, groupedPermissions }: Props) {
  const isEdit = !!role;
  const [searchTerm, setSearchTerm] = useState('');

  const { data, setData, post, put, processing, errors } = useForm({
    name: role?.name || '',
    permissions: role?.permissions?.map((p) => p.name) || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isEdit ? put(`/roles/${role?.id}`) : post('/roles');
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Role Management', href: '/roles' },
    { title: isEdit ? 'Edit Role' : 'Create Role', href: '#' },
  ];

  const togglePermission = (perm: string) => {
    setData('permissions', data.permissions.includes(perm)
      ? data.permissions.filter((p) => p !== perm)
      : [...data.permissions, perm]
    );
  };

  const toggleGroup = (group: string, perms: Permission[]) => {
    const allChecked = perms.every(perm => data.permissions.includes(perm.name));
    if (allChecked) {
      setData('permissions', data.permissions.filter(p => !perms.map(perm => perm.name).includes(p)));
    } else {
      const newPermissions = [...data.permissions];
      perms.forEach(perm => {
        if (!newPermissions.includes(perm.name)) {
          newPermissions.push(perm.name);
        }
      });
      setData('permissions', newPermissions);
    }
  };

  const selectAll = () => {
    const allPerms: string[] = [];
    Object.values(groupedPermissions).forEach(perms => {
      perms.forEach(p => allPerms.push(p.name));
    });
    setData('permissions', allPerms);
  };

  const deselectAll = () => {
    setData('permissions', []);
  };

  // Filter permissions based on search
  const filteredGroups = Object.entries(groupedPermissions).reduce((acc, [group, perms]) => {
    const filteredPerms = perms.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      group.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredPerms.length > 0) {
      acc[group] = filteredPerms;
    }
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEdit ? 'Edit Role' : 'Create Role'} />
      <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Role' : 'Create New Role'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEdit ? 'Update role details and permissions.' : 'Define a new role and assign permissions.'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/roles">
                <Button variant="outline" type="button">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" /> {isEdit ? 'Update Role' : 'Save Role'}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left Column: Role Details */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Role Details
                  </CardTitle>
                  <CardDescription>
                    Basic information about the role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      placeholder="e.g. Manager, Editor"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  
                  <div className="pt-4">
                    <div className="text-sm font-medium mb-2">Summary</div>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Selected Permissions:</span>
                        <Badge variant="secondary">{data.permissions.length}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Permissions */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Permissions</CardTitle>
                      <CardDescription>Assign capabilities to this role.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                        <CheckSquare className="mr-2 h-3.5 w-3.5" /> Select All
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                        <Square className="mr-2 h-3.5 w-3.5" /> Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search permissions..." 
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  {Object.keys(filteredGroups).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No permissions found matching "{searchTerm}"
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(filteredGroups).map(([group, perms]) => {
                        const allChecked = perms.every(perm => data.permissions.includes(perm.name));
                        const someChecked = perms.some(perm => data.permissions.includes(perm.name));
                        
                        return (
                          <div key={group} className="space-y-3">
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`group-${group}`}
                                  checked={allChecked}
                                  onCheckedChange={() => toggleGroup(group, perms)}
                                  className={someChecked && !allChecked ? "opacity-50" : ""}
                                />
                                <Label htmlFor={`group-${group}`} className="font-semibold text-base capitalize cursor-pointer">
                                  {group} Module
                                </Label>
                              </div>
                              <Badge variant="outline" className="bg-white dark:bg-gray-800">
                                {perms.filter(p => data.permissions.includes(p.name)).length} / {perms.length}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                              {perms.map((perm) => (
                                <div key={perm.id} className="flex items-start space-x-2 p-2 rounded hover:bg-accent/50 transition-colors">
                                  <Checkbox
                                    id={`perm-${perm.id}`}
                                    checked={data.permissions.includes(perm.name)}
                                    onCheckedChange={() => togglePermission(perm.name)}
                                    className="mt-0.5"
                                  />
                                  <div className="grid gap-1.5 leading-none">
                                    <Label
                                      htmlFor={`perm-${perm.id}`}
                                      className="text-sm font-normal cursor-pointer leading-snug"
                                    >
                                      {perm.name}
                                    </Label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}