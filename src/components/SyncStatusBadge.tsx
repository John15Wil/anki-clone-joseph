import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cloudSync, type SyncStatus } from '../lib/cloudSync';
import { Cloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

export function SyncStatusBadge() {
  const { user, isCloudSyncEnabled } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    lastSync: null,
    error: null
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user || !isCloudSyncEnabled) return;

    const unsubscribe = cloudSync.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, [user, isCloudSyncEnabled]);

  const handleManualSync = async () => {
    if (user) {
      await cloudSync.syncAll();
    }
  };

  if (!isCloudSyncEnabled || !user) {
    return null;
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
      >
        {syncStatus.syncing ? (
          <>
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-xs text-blue-600 font-medium">同步中...</span>
          </>
        ) : syncStatus.error ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-600 font-medium">同步失败</span>
          </>
        ) : syncStatus.lastSync ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">已同步</span>
          </>
        ) : (
          <>
            <Cloud className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-600 font-medium">云同步</span>
          </>
        )}
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-900 mb-1">云同步状态</div>
              <div className="text-xs text-gray-500">
                {syncStatus.syncing && '正在同步数据...'}
                {!syncStatus.syncing && syncStatus.error && (
                  <div className="text-red-600">{syncStatus.error}</div>
                )}
                {!syncStatus.syncing && !syncStatus.error && (
                  <div>上次同步: {formatLastSync(syncStatus.lastSync)}</div>
                )}
              </div>
            </div>

            <Button
              onClick={handleManualSync}
              disabled={syncStatus.syncing}
              className="w-full text-sm"
              size="sm"
            >
              {syncStatus.syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  立即同步
                </>
              )}
            </Button>

            <div className="pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <div>• 数据每5分钟自动同步</div>
                <div>• 所有数据加密存储</div>
                <div>• 支持多设备同步</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
