import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Button } from '@/components/admin';
import { RefreshCw, Settings } from 'lucide-react';

export const ActionsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [reloading, setReloading] = React.useState(false);
  const [rebuilding, setRebuilding] = React.useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['restaurant'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['redirects'] }),
      ]);
      alert('Dati aggiornati!');
    } catch (error) {
      alert('Errore nel ricaricare i dati');
    } finally {
      setReloading(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const response = await fetch('/api/rebuild', { method: 'POST' });
      if (response.ok) {
        alert('Menu rigenerato! Ricarica il sito per vedere le modifiche.');
      }
    } catch (error) {
      alert('Ricarica il sito manualmente per vedere le modifiche.');
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <Card title="Azioni">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="secondary" onClick={handleReload} loading={reloading}><RefreshCw className="w-4 h-4 mr-2" />Ricarica Dati</Button>
          <Button variant="primary" onClick={handleRebuild} loading={rebuilding}><Settings className="w-4 h-4 mr-2" />Rigenera Menu</Button>
        </div>
      </div>
    </Card>
  );
};
