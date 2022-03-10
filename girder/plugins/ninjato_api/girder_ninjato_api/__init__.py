from girder.plugin import getPlugin, GirderPlugin
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.constants import AccessType
from .utils import get_item_assignment, save_user_annotation_as_item, get_subvolume_item_ids, \
    get_subvolume_item_info, save_region_flag, save_region_flag_review


@access.public
@autoDescribeRoute(
    Description('Get region assignment info for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id from which to get assignment', default='', required=False)
    .param('task_type', 'task type of regions to get assignment for. It must be one of four items '
                        'in the list [flag, review, split, refine]', default='', required=True)
    .errorResponse()
    .errorResponse('Read access was denied on the user.', 403)
)
def get_user_assign_info(user, subvolume_id, task_type):
    return get_item_assignment(user, subvolume_id, task_type)


@access.public
@autoDescribeRoute(
    Description('Save annotation for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The item ID to save user annotation for', required=True)
    .param('done', 'A boolean True or False to indicate whether the annotation is done',
           dataType='boolean', default=False, required=False)
    .param('reject', 'A boolean True or False to indicate whether the annotation should be '
                     'rejected. If set to False, annotation will be saved. The default is False.',
           dataType='boolean', default=False, required=False)
    .param('comment', 'annotation comment added by the user', default='', required=False)
    .param('content_data', 'annotation content blob data in FormData format with data '
                           'key to be saved on server. If reject is False so annotation needs '
                           'to be saved, this parameter is required.',
           required=False, paramType='formData')
    .errorResponse()
    .errorResponse('Save action was denied on the user.', 403)
    .errorResponse('Failed to save user annotations', 500)
)
def save_user_annotation(user, item_id, done, reject, comment, content_data):
    return save_user_annotation_as_item(user, item_id, done, reject, comment, content_data)


@access.public
@autoDescribeRoute(
    Description('Get subvolume item ids.')
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get subvolume ids', 500)
)
def get_subvolume_ids():
    return get_subvolume_item_ids()


@access.public
@autoDescribeRoute(
    Description('Get the specified subvolume item info.')
    .modelParam('id', 'The item ID', model='item', level=AccessType.READ)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get subvolume info', 500)
)
def get_subvolume_info(item):
    return get_subvolume_item_info(item)


@access.public
@autoDescribeRoute(
    Description('Save a flag for a region from a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The item ID to save flag for', required=True)
    .param('done', 'A boolean True or False to indicate whether the flagging is done',
           dataType='boolean', default=False, required=False)
    .param('reject', 'A boolean True or False to indicate whether the flagging should be '
                     'rejected. If set to False, flagging will be saved. The default is False.',
           dataType='boolean', default=False, required=False)
    .param('flagged', 'a boolean to indicate whether the region is normal (False) or '
                      'flagged for problem (True)', dataType='boolean', required=True)
    .param('comment', 'a comment associated with the flag', default='', required=False)
    .param('region_ids', 'a list of associated region ids with the region if flagged',
           dataType=list, default=[], required=False)
    .errorResponse()
    .errorResponse('Save action was denied on the user.', 403)
    .errorResponse('Failed to save the flag for the region', 500)
)
def save_user_region_flag(user, item_id, flagged, comment, region_ids, reject, done):
    return save_region_flag(user, item_id, flagged, comment, region_ids, reject, done)


@access.public
@autoDescribeRoute(
    Description('Save a flag for a region from a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The item ID to save flag for', required=True)
    .param('result', 'a JSON list of regions marked to be split, merge & split, or '
                     'merge & refine, e.g., [{[region1_id], split: false}, '
                     '{[region1_id, region2_id], split: true}, {[region1_id, region2_id]}, '
                     'split: false}] where the first item indicates refine region1, the '
                     'second item indicates merge region1 and region2, then split the '
                     'merged region, the third item indicates merge region1 and region2, '
                     'then refine the merged region', dataType=list, required=True)
    .param('comment', 'a comment associated with the review', default='', required=False)
    .errorResponse()
    .errorResponse('Save action was denied on the user.', 403)
    .errorResponse('Failed to save the flag review result for the region', 500)
)
def save_user_region_flag_review(user, item_id, result, comment):
    return save_region_flag_review(user, item_id, result, comment)


class NinjatoPlugin(GirderPlugin):
    DISPLAY_NAME = 'Girder Ninjato API'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        # add plugin loading logic here
        getPlugin('jobs').load(info)
        # attach API route to Girder
        info['apiRoot'].user.route('GET', (':id', 'assignment'), get_user_assign_info)
        info['apiRoot'].user.route('POST', (':id', 'annotation'), save_user_annotation)
        info['apiRoot'].user.route('POST', (':id', 'flag'), save_user_region_flag)
        info['apiRoot'].user.route('POST', (':id', 'flag_review'), save_user_region_flag_review)
        info['apiRoot'].system.route('GET', ('subvolume_ids',), get_subvolume_ids)
        info['apiRoot'].item.route('GET', (':id', 'subvolume_info'), get_subvolume_info)
